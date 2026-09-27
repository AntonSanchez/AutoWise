import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseAuthProfile,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { defaultProfile } from '@/constants/vehicle-defaults';
import { resetNavigationHistory } from '@/hooks/use-safe-navigation';
import { auth, db } from '@/lib/firebase';

type AuthContextValue = {
  user: User | null;
  isLoggedIn: boolean;
  // True until the first onAuthStateChanged callback fires, so the root layout can avoid a flash
  // of the login screen while Firebase checks for a previously-signed-in user.
  isInitializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const authErrorMessages: Record<string, string> = {
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-not-found': 'No account found for that email.',
  'auth/wrong-password': 'Incorrect password. Try again.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

function getAuthErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';

  return authErrorMessages[code] ?? 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser: User | null) => {
      setUser(nextUser);
      setIsInitializing(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: user !== null,
      isInitializing,
      signIn: async (email: string, password: string) => {
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
          // Guarded routes drop the login screen from history the moment isLoggedIn flips true
          // (see app/_layout.tsx), but clear it here too in case anything queued a route earlier.
          resetNavigationHistory();
        } catch (error) {
          throw new Error(getAuthErrorMessage(error));
        }
      },
      signUp: async (name: string, email: string, password: string) => {
        try {
          const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await updateFirebaseAuthProfile(credential.user, { displayName: name.trim() });
          // Seed this user's Firestore profile doc. scheduledServices/history subcollections
          // start out empty - they're created the first time the user books or logs a service.
          await setDoc(doc(db, 'users', credential.user.uid), {
            ...defaultProfile,
            ownerName: name.trim(),
            createdAt: serverTimestamp(),
          });
          resetNavigationHistory();
        } catch (error) {
          throw new Error(getAuthErrorMessage(error));
        }
      },
      signOut: async () => {
        resetNavigationHistory();
        await firebaseSignOut(auth);
      },
    }),
    [user, isInitializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
