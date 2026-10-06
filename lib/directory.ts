import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

import type { AccountRole } from '@/components/auth-provider';
import { db } from '@/lib/firebase';

// Finding someone to message by their email address.
//
// Customers can't read each other's profiles, and there is no public list of users. Instead every account
// publishes a tiny entry at /emailIndex/{email in lowercase} holding its uid, display name and role.
// Rules let any signed-in person read ONE entry if they already know the exact email, but never list them,
// so people can only be found by someone who knows their address.

export type DirectoryEntry = { uid: string; name: string; role: AccountRole };

const keyFor = (email: string) => email.trim().toLowerCase();

export async function registerEmail(uid: string, email: string, name: string, role: AccountRole) {
  await setDoc(doc(db, 'emailIndex', keyFor(email)), { uid, name: name.trim().slice(0, 100) || 'User', role });
}

export async function removeEmail(email: string) {
  await deleteDoc(doc(db, 'emailIndex', keyFor(email)));
}

export async function findUserByEmail(email: string): Promise<DirectoryEntry | null> {
  const snapshot = await getDoc(doc(db, 'emailIndex', keyFor(email)));
  const data = snapshot.data();

  if (!data || typeof data.uid !== 'string') {
    return null;
  }

  return {
    uid: data.uid,
    name: typeof data.name === 'string' && data.name ? data.name : 'User',
    role: data.role === 'mechanic' ? 'mechanic' : 'customer',
  };
}
