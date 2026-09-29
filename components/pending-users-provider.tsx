import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected';

export type PendingUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  joined: string;
  status: ReviewStatus;
  assignedMechanic?: string;
  assignedDate?: string;
};

type PendingUsersContextValue = {
  users: PendingUser[];
  addUser: (name: string, email: string, password: string) => void;
  updateStatus: (id: number, status: ReviewStatus, assignment?: { mechanic: string; date: string }) => void;
  isApproved: (email: string) => boolean;
  isPending: (email: string) => boolean;
  isRejected: (email: string) => boolean;
  findUser: (email: string, password: string) => PendingUser | undefined;
};

const PendingUsersContext = createContext<PendingUsersContextValue | undefined>(undefined);

let nextId = 1;
const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function PendingUsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<PendingUser[]>([]);

  const addUser = useCallback((name: string, email: string, password: string) => {
    setUsers((current) => [
      { id: nextId++, name, email, password, joined: formatDate(new Date()), status: 'Pending' as ReviewStatus },
      ...current,
    ]);
  }, []);

  const updateStatus = useCallback((id: number, status: ReviewStatus, assignment?: { mechanic: string; date: string }) => {
    setUsers((current) => current.map((u) => (u.id === id ? {
      ...u,
      status,
      assignedMechanic: status === 'Approved' ? assignment?.mechanic : undefined,
      assignedDate: status === 'Approved' ? assignment?.date : undefined,
    } : u)));
  }, []);

  const isApproved = useCallback(
    (email: string) => users.some((u) => u.email.toLowerCase() === email.toLowerCase() && u.status === 'Approved'),
    [users],
  );

  const isPending = useCallback(
    (email: string) => users.some((u) => u.email.toLowerCase() === email.toLowerCase() && u.status === 'Pending'),
    [users],
  );

  const isRejected = useCallback(
    (email: string) => users.some((u) => u.email.toLowerCase() === email.toLowerCase() && u.status === 'Rejected'),
    [users],
  );

  const findUser = useCallback(
    (email: string, password: string) =>
      users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password),
    [users],
  );

  const value = useMemo(
    () => ({ users, addUser, updateStatus, isApproved, isPending, isRejected, findUser }),
    [users, addUser, updateStatus, isApproved, isPending, isRejected, findUser],
  );

  return <PendingUsersContext.Provider value={value}>{children}</PendingUsersContext.Provider>;
}

export function usePendingUsers() {
  const context = useContext(PendingUsersContext);
  if (!context) {
    throw new Error('usePendingUsers must be used within PendingUsersProvider');
  }
  return context;
}
