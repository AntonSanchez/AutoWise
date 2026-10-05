import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseAuthProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { defaultProfile } from '@/constants/vehicle-defaults';
import { resetNavigationHistory } from '@/hooks/use-safe-navigation';
import { auth, db } from '@/lib/firebase';
import { registerForPush, unregisterPush } from '@/lib/notifications';

// What kind of account this is. Chosen with the Customer / Mechanic buttons at sign-up and fixed
// afterwards (firestore.rules stops users from changing it). Admins are regular customer accounts
// that also have a document in the `admins` collection.
export type AccountRole = 'customer' | 'mechanic';

type AuthContextValue = {
  user: User | null;
  // True once the user is signed in AND their profile (and so their role) has been loaded and
  // checked against the Customer / Mechanic button they used to sign in.
  isLoggedIn: boolean;
  role: AccountRole;
  // Mechanic accounts can't see or accept anything until an admin approves them.
  mechanicApproved: boolean;
  // True when this user has a document in the Firestore `admins` collection (created by hand in the
  // Firebase console - see ADMIN_SETUP.md). Only controls what the UI shows; firestore.rules is what
  // actually stops a non-admin from reading other people's data.
  isAdmin: boolean;
  // Set when the app signed the user out on its own (e.g. an admin disabled the account), so the
  // login screen can explain why. Call clearSessionNotice once it has been shown.
  sessionNotice: string;
  clearSessionNotice: () => void;
  // True until Firebase has reported whether a session is already saved on this device (and, if so,
  // loaded that account's profile), so the root layout can avoid a flash of the wrong screen.
  isInitializing: boolean;
  signIn: (email: string, password: string, role: AccountRole) => Promise<void>;
  signUp: (name: string, email: string, password: string, role: AccountRole) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

type AccountInfo = { uid: string; role: AccountRole; mechanicApproved: boolean };

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
  const [authReady, setAuthReady] = useState(false);
  // Only true during app start-up, while a saved session's profile is still loading.
  const [coldStart, setColdStart] = useState(true);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionNotice, setSessionNotice] = useState('');
  // The Customer / Mechanic button used on the login screen, checked against the account's real role
  // as soon as its profile arrives. Null when restoring a saved session (nothing to check).
  const expectedRoleRef = useRef<AccountRole | null>(null);
  // While sign-up is still writing the new profile, an empty profile snapshot is expected.
  const signingUpRef = useRef(false);
  const uid = user?.uid ?? null;
  const email = user?.email ?? null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser: User | null) => {
      setUser(nextUser);
      setAuthReady(true);

      if (!nextUser) {
        setColdStart(false);
      }
    });

    return unsubscribe;
  }, []);

  // Look up whether the signed-in user is an admin.
  useEffect(() => {
    if (!uid) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;
    getDoc(doc(db, 'admins', uid))
      .then((snapshot) => {
        if (!cancelled) setIsAdmin(snapshot.exists());
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Watches this user's own profile document so that:
  //  1. the account's role is known before any screen is shown, and a wrong Customer / Mechanic
  //     choice on the login screen is turned away,
  //  2. an account an admin disabled is signed out right away, even mid-session,
  //  3. a mechanic gets the dashboard the moment an admin approves them, and
  //  4. the sign-in email is kept on the profile, which is how admins tell accounts apart
  //     (Firebase Auth emails aren't readable from the client).
  useEffect(() => {
    if (!uid) {
      setAccount(null);
      return;
    }

    const rejectAndSignOut = (notice: string) => {
      expectedRoleRef.current = null;
      setSessionNotice(notice);
      setColdStart(false);
      resetNavigationHistory();
      firebaseSignOut(auth).catch(() => {});
    };

    return onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        const data = snapshot.data();

        if (!snapshot.exists() && signingUpRef.current) {
          return;
        }

        if (data?.disabled === true) {
          rejectAndSignOut('This account has been disabled. Contact an administrator for help.');
          return;
        }

        const role: AccountRole = data?.role === 'mechanic' ? 'mechanic' : 'customer';
        const expected = expectedRoleRef.current;

        if (expected && expected !== role) {
          rejectAndSignOut(
            role === 'mechanic'
              ? 'That is a mechanic account. Choose Mechanic above to sign in.'
              : 'That is a customer account. Choose Customer above to sign in.',
          );
          return;
        }

        expectedRoleRef.current = null;
        setAccount({ uid, role, mechanicApproved: role === 'mechanic' && data?.mechanicApproved === true });
        setColdStart(false);

        // Only ever update an existing profile here. Creating it is sign-up's job, and doing it from
        // this listener could race with sign-up and get its `role` write refused.
        if (snapshot.exists() && email && data?.email !== email) {
          setDoc(doc(db, 'users', uid), { email }, { merge: true }).catch(() => {});
        }
      },
      () => {
        // Couldn't read the profile (offline, or rules not published). Fall back to a customer view
        // rather than leaving the app stuck on the loading spinner.
        expectedRoleRef.current = null;
        setAccount({ uid, role: 'customer', mechanicApproved: false });
        setColdStart(false);
      },
    );
  }, [uid, email]);

  const profileLoaded = account !== null && account.uid === uid;

  // Once the profile is loaded, register this device for push notifications (asks permission the first time).
  useEffect(() => {
    if (uid && profileLoaded) {
      registerForPush(uid);
    }
  }, [uid, profileLoaded]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: user !== null && profileLoaded,
      role: profileLoaded ? account.role : 'customer',
      mechanicApproved: profileLoaded ? account.mechanicApproved : false,
      isAdmin,
      sessionNotice,
      clearSessionNotice: () => setSessionNotice(''),
      isInitializing: !authReady || (coldStart && user !== null && !profileLoaded),
      signIn: async (email: string, password: string, role: AccountRole) => {
        expectedRoleRef.current = role;

        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
          // Guarded routes drop the login screen from history the moment isLoggedIn flips true
          // (see app/_layout.tsx), but clear it here too in case anything queued a route earlier.
          resetNavigationHistory();
        } catch (error) {
          expectedRoleRef.current = null;
          throw new Error(getAuthErrorMessage(error));
        }
      },
      signUp: async (name: string, email: string, password: string, role: AccountRole) => {
        expectedRoleRef.current = null;
        signingUpRef.current = true;
        let created: User | null = null;

        try {
          const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          created = credential.user;
          await updateFirebaseAuthProfile(credential.user, { displayName: name.trim() });
          // Seed this user's Firestore profile doc. scheduledServices/history subcollections
          // start out empty - they're created the first time the user books or logs a service.
          // Mechanics start unapproved; only an admin can approve them (see firestore.rules).
          await setDoc(doc(db, 'users', credential.user.uid), {
            ...defaultProfile,
            ownerName: name.trim(),
            email: credential.user.email ?? email.trim(),
            role,
            ...(role === 'mechanic' ? { mechanicApproved: false } : {}),
            createdAt: serverTimestamp(),
          });
          resetNavigationHistory();
        } catch (error) {
          // If the login was created but its profile couldn't be saved, remove the half-made login so
          // the person can simply try again instead of being stuck signed in to nothing.
          if (created) {
            await created.delete().catch(() => firebaseSignOut(auth).catch(() => {}));
          }
          throw new Error(getAuthErrorMessage(error));
        } finally {
          signingUpRef.current = false;
        }
      },
      resetPassword: async (email: string) => {
        try {
          await sendPasswordResetEmail(auth, email.trim());
        } catch (error) {
          throw new Error(getAuthErrorMessage(error));
        }
      },
      signOut: async () => {
        resetNavigationHistory();
        // Stop this device receiving the account's notifications. Done before signing out, while the
        // rules still know who is asking.
        if (user) {
          await unregisterPush(user.uid);
        }
        await firebaseSignOut(auth);
      },
    }),
    [user, authReady, coldStart, account, profileLoaded, isAdmin, sessionNotice],
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
