import { sendPasswordResetEmail } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';

import type { Car } from '@/components/profile-provider';
import { removeEmail } from '@/lib/directory';
import { auth, db } from '@/lib/firebase';

// Everything in here only works for signed-in admins: firestore.rules is what enforces that.
// A regular user calling these would simply get "permission denied" from Firestore.

export type AdminUser = {
  uid: string;
  ownerName: string;
  email: string;
  phoneNumber: string;
  avatarUri: string;
  primaryCarId: string;
  disabled: boolean;
  deletedByAdmin: boolean;
  role: 'customer' | 'mechanic';
  mechanicApproved: boolean;
  createdAtMs: number | null;
};

export type CarInput = Omit<Car, 'id'>;

const userSubcollections = ['cars', 'scheduledServices', 'history', 'records'] as const;

function toAdminUser(uid: string, data: DocumentData): AdminUser {
  const createdAt = data.createdAt;

  return {
    uid,
    ownerName: typeof data.ownerName === 'string' ? data.ownerName : '',
    email: typeof data.email === 'string' ? data.email : '',
    phoneNumber: typeof data.phoneNumber === 'string' ? data.phoneNumber : '',
    avatarUri: typeof data.avatarUri === 'string' ? data.avatarUri : '',
    primaryCarId: typeof data.primaryCarId === 'string' ? data.primaryCarId : '',
    disabled: data.disabled === true,
    deletedByAdmin: data.deletedByAdmin === true,
    role: data.role === 'mechanic' ? 'mechanic' : 'customer',
    mechanicApproved: data.role === 'mechanic' && data.mechanicApproved === true,
    createdAtMs: createdAt && typeof createdAt.toMillis === 'function' ? createdAt.toMillis() : null,
  };
}

export function subscribeUsers(onData: (users: AdminUser[]) => void, onError: (error: FirestoreError) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const users = snapshot.docs.map((item) => toAdminUser(item.id, item.data()));
      users.sort((a, b) => (a.ownerName || a.email).localeCompare(b.ownerName || b.email));
      onData(users);
    },
    onError,
  );
}

export function subscribeUser(uid: string, onData: (user: AdminUser | null) => void, onError: (error: FirestoreError) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => onData(snapshot.exists() ? toAdminUser(snapshot.id, snapshot.data()) : null),
    onError,
  );
}

export function subscribeAdminIds(onData: (ids: Set<string>) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'admins'),
    (snapshot) => onData(new Set(snapshot.docs.map((item) => item.id))),
    () => onData(new Set()),
  );
}

export function subscribeUserCars(uid: string, onData: (cars: Car[]) => void, onError: (error: FirestoreError) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'users', uid, 'cars'), orderBy('createdAt', 'asc')),
    (snapshot) => onData(snapshot.docs.map((item) => ({ ...(item.data() as Car), id: item.id }))),
    onError,
  );
}

export async function getUserCar(uid: string, carId: string): Promise<Car | null> {
  const snapshot = await getDoc(doc(db, 'users', uid, 'cars', carId));

  return snapshot.exists() ? { ...(snapshot.data() as Car), id: snapshot.id } : null;
}

export async function updateUserProfile(uid: string, changes: { ownerName: string; phoneNumber: string }) {
  await updateDoc(doc(db, 'users', uid), changes);
}

export async function sendUserPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

// Approving a mechanic is what lets them see and accept customers' service and checkup requests.
export async function setMechanicApproved(uid: string, approved: boolean) {
  await updateDoc(doc(db, 'users', uid), { mechanicApproved: approved });
}

export async function setUserDisabled(uid: string, disabled: boolean) {
  await updateDoc(doc(db, 'users', uid), { disabled });
}

export async function saveUserCar(uid: string, carId: string | null, input: CarInput): Promise<string> {
  if (carId) {
    await setDoc(doc(db, 'users', uid, 'cars', carId), input, { merge: true });
    return carId;
  }

  // Same id scheme the app itself uses when a user adds a car, plus createdAt so it sorts
  // correctly in that user's garage.
  const id = `${Date.now()}`;
  await setDoc(doc(db, 'users', uid, 'cars', id), { ...input, id, createdAt: serverTimestamp() });
  return id;
}

async function deleteRefs(refs: DocumentReference[]) {
  // A Firestore batch holds at most 500 writes.
  for (let start = 0; start < refs.length; start += 400) {
    const batch = writeBatch(db);
    refs.slice(start, start + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

// Mirrors the user-side deleteCar in components/profile-provider.tsx: removing a car also removes
// the booked services, history and records that belong to it, and clears the primary car if needed.
export async function deleteUserCar(uid: string, carId: string, isPrimary: boolean) {
  const refs: DocumentReference[] = [doc(db, 'users', uid, 'cars', carId)];

  for (const name of ['scheduledServices', 'history', 'records'] as const) {
    const related = await getDocs(query(collection(db, 'users', uid, name), where('carId', '==', carId)));
    related.docs.forEach((item) => refs.push(item.ref));
  }

  await deleteRefs(refs);

  if (isPrimary) {
    await updateDoc(doc(db, 'users', uid), { primaryCarId: '' });
  }
}

// Wipes everything the account owns (cars, services, history, records) and disables it.
// The Firebase Authentication login itself can't be removed from inside the app - that needs the
// Firebase console or a Cloud Function - so the profile is kept, flagged as deleted and disabled,
// which stops that login from getting back into the app.
export async function deleteAccountData(uid: string, email?: string) {
  const refs: DocumentReference[] = [];

  for (const name of userSubcollections) {
    const snapshot = await getDocs(collection(db, 'users', uid, name));
    snapshot.docs.forEach((item) => refs.push(item.ref));
  }

  await deleteRefs(refs);

  // Take the account out of the "find by email" directory too.
  if (email) {
    await removeEmail(email).catch(() => {});
  }

  await updateDoc(doc(db, 'users', uid), {
    disabled: true,
    deletedByAdmin: true,
    primaryCarId: '',
    phoneNumber: '',
    avatarUri: '',
  });
}
