import React, { createContext, useContext, useMemo, useState } from 'react';

import { resetNavigationHistory } from '@/hooks/use-safe-navigation';

type AuthContextValue = {
  isLoggedIn: boolean;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const value = useMemo(
    () => ({
      isLoggedIn,
      signIn: () => {
        resetNavigationHistory();
        setIsLoggedIn(true);
      },
      signOut: () => {
        resetNavigationHistory();
        setIsLoggedIn(false);
      },
    }),
    [isLoggedIn],
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
