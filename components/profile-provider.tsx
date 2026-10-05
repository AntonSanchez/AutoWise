import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type FirestoreError,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { defaultProfile, type UserProfile } from '@/constants/vehicle-defaults';
import { db } from '@/lib/firebase';

import { useAuth } from './auth-provider';

export type { UserProfile } from '@/constants/vehicle-defaults';
export { defaultProfile } from '@/constants/vehicle-defaults';

export type Car = {
  id: string;
  vehicleName: string;
  vehicleModel: string;
  transmissionType: string;
  fuelType: string;
  dateBought: string;
  description: string;
};

export type MaintenanceStatus =
  | 'GOOD'
  | 'UPCOMING'
  | 'DUE SOON'
  | 'DUE'
  | 'OVERDUE'
  | 'INSPECTION REQUIRED'
  | 'REPLACEMENT REQUIRED';

export type MaintenanceRecommendation = {
  title: string;
  interval: number;
  action: string;
  replacementNote?: string;
  targetMileage: number;
  dueIn: number;
  status: MaintenanceStatus;
  icon: string;
};

export type ScheduledService = {
  id: string;
  carId: string;
  title: string;
  vehicle: string;
  time: string;
  scheduledDate: string;
  notes: string;
  // Extra details so a mechanic can act on the request without reading the customer's profile.
  // Older bookings don't have them: no status means 'pending', no requestType means 'service'.
  requestType?: 'service' | 'checkup';
  customerName?: string;
  vehicleModel?: string;
  // The mechanic's response. Only mechanics (and admins) can change these - see firestore.rules.
  status?: 'pending' | 'accepted' | 'in_progress' | 'completed';
  mechanicId?: string;
  mechanicName?: string;
};

export type VehicleHistoryItem = {
  id: string;
  carId: string;
  title: string;
  date: string;
  mileage: string;
  status: 'Completed' | 'Scheduled' | 'In Progress';
};

export type VehicleRecord = {
  id: string;
  carId: string;
  title: string;
  value: string;
  detail: string;
};

const maintenanceTemplates = [
  { title: 'ENGINE OIL', interval: 5000, action: 'Replace', icon: 'construct-outline', replacementNote: 'Recommended interval: 5,000 km', isReplacementRequired: true },
  { title: 'OIL FILTER', interval: 5000, action: 'Replace', icon: 'filter-outline', replacementNote: 'Recommended interval: 5,000 km', isReplacementRequired: true },
  { title: 'AIR FILTER', interval: 20000, action: 'Inspect/Replace', icon: 'filter-outline', replacementNote: 'Recommended interval: 20,000 km', isReplacementRequired: true },
  { title: 'CABIN AIR FILTER', interval: 15000, action: 'Inspect/Replace', icon: 'cloud-outline', replacementNote: 'Recommended interval: 15,000 km', isReplacementRequired: true },
  { title: 'BRAKE FLUID', interval: 40000, action: 'Inspect/Replace', icon: 'water-outline', replacementNote: 'Recommended interval: 40,000 km • 2 years', isReplacementRequired: true },
  { title: 'COOLANT', interval: 40000, action: 'Inspect/Replace', icon: 'thermometer-outline', replacementNote: 'Recommended interval: 40,000 km', isReplacementRequired: true },
  { title: 'SPARK PLUGS', interval: 40000, action: 'Inspect/Replace', icon: 'flash-outline', replacementNote: 'Recommended interval: 40,000 km', isReplacementRequired: true },
  { title: 'AUTOMATIC TRANSMISSION FLUID', interval: 40000, action: 'Inspect/Replace', icon: 'car-sport-outline', replacementNote: 'Recommended interval: 40,000 km', isReplacementRequired: true },
  { title: 'MANUAL TRANSMISSION FLUID', interval: 40000, action: 'Inspect/Replace', icon: 'car-sport-outline', replacementNote: 'Recommended interval: 40,000 km', isReplacementRequired: true },
  { title: 'CVT FLUID', interval: 40000, action: 'Inspect/Replace', icon: 'car-sport-outline', replacementNote: 'Recommended interval: 40,000 km', isReplacementRequired: true },
  { title: 'BRAKE PADS', interval: 10000, action: 'Inspect', icon: 'warning', replacementNote: 'Replacement: Based on condition', isReplacementRequired: false },
  { title: 'BRAKE ROTORS/DISCS', interval: 20000, action: 'Inspect', icon: 'warning', replacementNote: 'Replacement: Based on condition', isReplacementRequired: false },
  { title: 'TIRES', interval: 10000, action: 'Inspect/Rotate', icon: 'refresh', replacementNote: 'Replacement: Based on tread, damage, and age', isReplacementRequired: false },
  { title: 'BATTERY', interval: 20000, action: 'Inspect', icon: 'battery-charging-outline', replacementNote: 'Replacement: Based on condition', isReplacementRequired: false },
  { title: 'DRIVE BELT/SERPENTINE BELT', interval: 40000, action: 'Inspect', icon: 'sync-outline', replacementNote: 'Replacement: Based on condition', isReplacementRequired: false },
  { title: 'TIMING BELT', interval: 100000, action: 'Inspect/Replace', icon: 'time-outline', replacementNote: 'Follow manufacturer-specific interval', isReplacementRequired: true },
  { title: 'WHEEL ALIGNMENT', interval: 10000, action: 'Inspect/Adjust', icon: 'compass-outline', replacementNote: 'Recommended interval: 10,000 km', isReplacementRequired: false },
  { title: 'WHEEL BALANCING', interval: 10000, action: 'Inspect/Balance', icon: 'options-outline', replacementNote: 'Recommended interval: 10,000 km', isReplacementRequired: false },
  { title: 'ENGINE AIR INTAKE', interval: 20000, action: 'Inspect/Clean', icon: 'sparkles-outline', replacementNote: 'Recommended interval: 20,000 km', isReplacementRequired: false },
  { title: 'FUEL FILTER', interval: 40000, action: 'Inspect/Replace', icon: 'filter-outline', replacementNote: 'Recommended interval: 40,000 km', isReplacementRequired: true },
  { title: 'POWER STEERING FLUID', interval: 40000, action: 'Inspect/Replace if applicable', icon: 'water-outline', replacementNote: 'Recommended interval: 40,000 km', isReplacementRequired: true },
  { title: 'WIPER BLADES', interval: 20000, action: 'Inspect/Replace', icon: 'sparkles-outline', replacementNote: 'Recommended interval: 20,000 km', isReplacementRequired: true },
  { title: 'SUSPENSION', interval: 20000, action: 'Inspect', icon: 'move-outline', replacementNote: 'Recommended interval: 20,000 km', isReplacementRequired: false },
  { title: 'SHOCK ABSORBERS', interval: 40000, action: 'Inspect', icon: 'pulse-outline', replacementNote: 'Recommended interval: 40,000 km', isReplacementRequired: false },
  { title: 'STEERING SYSTEM', interval: 20000, action: 'Inspect', icon: 'navigate-outline', replacementNote: 'Recommended interval: 20,000 km', isReplacementRequired: false },
  { title: 'DRIVE SHAFT/CV JOINT', interval: 20000, action: 'Inspect', icon: 'arrow-forward-outline', replacementNote: 'Recommended interval: 20,000 km', isReplacementRequired: false },
  { title: 'ENGINE MOUNTS', interval: 40000, action: 'Inspect', icon: 'hardware-chip-outline', replacementNote: 'Recommended interval: 40,000 km', isReplacementRequired: false },
  { title: 'EXHAUST SYSTEM', interval: 20000, action: 'Inspect', icon: 'radio-outline', replacementNote: 'Recommended interval: 20,000 km', isReplacementRequired: false },
  { title: 'AC SYSTEM', interval: 20000, action: 'Inspect/Clean', icon: 'snow-outline', replacementNote: 'Recommended interval: 20,000 km', isReplacementRequired: false },
  { title: 'AC REFRIGERANT', interval: 40000, action: 'Inspect', icon: 'snow-outline', replacementNote: 'Replacement: Only if needed', isReplacementRequired: false },
] as const satisfies ReadonlyArray<{
  title: string;
  interval: number;
  action: string;
  replacementNote?: string;
  icon: string;
  isReplacementRequired: boolean;
}>;

export function parseOdometer(value: string): number {
  const digitsOnly = value.replace(/[^0-9]/g, '');
  const parsedValue = Number(digitsOnly);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getRecommendationStatus(item: { interval: number; action: string; isReplacementRequired: boolean }, currentMileage: number): MaintenanceStatus {
  const nextDueMileage = Math.ceil(currentMileage / item.interval) * item.interval;
  const dueIn = Math.max(nextDueMileage - currentMileage, 0);

  if (dueIn === 0) {
    if (item.isReplacementRequired || item.action.toLowerCase().includes('replace')) {
      return 'REPLACEMENT REQUIRED';
    }

    return 'INSPECTION REQUIRED';
  }

  if (dueIn <= 1000) {
    return 'DUE SOON';
  }

  if (dueIn <= 3000) {
    return 'UPCOMING';
  }

  if (currentMileage > nextDueMileage) {
    return item.isReplacementRequired || item.action.toLowerCase().includes('replace')
      ? 'REPLACEMENT REQUIRED'
      : 'OVERDUE';
  }

  return 'GOOD';
}

export function getMaintenanceRecommendations(value: string): MaintenanceRecommendation[] {
  const currentMileage = parseOdometer(value);

  return maintenanceTemplates
    .map((item) => {
      const nextDueMileage = Math.ceil(currentMileage / item.interval) * item.interval || item.interval;
      const dueIn = Math.max(nextDueMileage - currentMileage, 0);

      return {
        title: item.title,
        interval: item.interval,
        action: item.action,
        replacementNote: item.replacementNote,
        targetMileage: nextDueMileage,
        dueIn,
        status: getRecommendationStatus(item, currentMileage),
        icon: item.icon,
      };
    })
    .sort((a, b) => a.dueIn - b.dueIn || a.interval - b.interval);
}

export function getNextMaintenanceRecommendation(value: string): MaintenanceRecommendation {
  const recommendations = getMaintenanceRecommendations(value);

  return recommendations[0] ?? {
    title: 'ENGINE OIL',
    interval: 5000,
    action: 'Replace',
    replacementNote: 'Recommended interval: 5,000 km',
    targetMileage: 5000,
    dueIn: 5000,
    status: 'GOOD',
    icon: 'construct-outline',
  };
}

type ProfileContextValue = {
  profile: UserProfile;
  cars: Car[];
  scheduledServices: ScheduledService[];
  historyItems: VehicleHistoryItem[];
  records: VehicleRecord[];
  isSyncing: boolean;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (changes: Partial<UserProfile>) => void;
  addCar: (car: Car) => void;
  updateCar: (id: string, changes: Partial<Omit<Car, 'id'>>) => void;
  deleteCar: (id: string) => void;
  addScheduledService: (service: ScheduledService) => void;
  removeScheduledService: (id: string) => void;
  addHistoryItem: (item: VehicleHistoryItem) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistoryItems: () => void;
  addRecord: (record: VehicleRecord) => void;
  deleteRecord: (id: string) => void;
  clearRecordsForCar: (carId: string) => void;
  resetProfileSession: () => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [profile, setProfileState] = useState<UserProfile>(defaultProfile);
  const [cars, setCars] = useState<Car[]>([]);
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>([]);
  const [historyItems, setHistoryItems] = useState<VehicleHistoryItem[]>([]);
  const [records, setRecords] = useState<VehicleRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Subscribes to this user's Firestore data while signed in, and reverts to a blank local
  // state (nothing persisted) the moment they sign out.
  useEffect(() => {
    if (!uid) {
      setProfileState(defaultProfile);
      setCars([]);
      setScheduledServices([]);
      setHistoryItems([]);
      setRecords([]);
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);

    const unsubscribeProfile = onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        const data = snapshot.data();
        if (data) {
          setProfileState((current) => ({ ...current, ...(data as Partial<UserProfile>) }));
        }
        setIsSyncing(false);
      },
      (error: FirestoreError) => console.error('AutoWise: profile sync failed', error),
    );

    const unsubscribeCars = onSnapshot(
      query(collection(db, 'users', uid, 'cars'), orderBy('createdAt', 'asc')),
      (snapshot) => {
        setCars(snapshot.docs.map((item: QueryDocumentSnapshot) => item.data() as Car));
      },
      (error: FirestoreError) => console.error('AutoWise: cars sync failed', error),
    );

    const unsubscribeScheduled = onSnapshot(
      query(collection(db, 'users', uid, 'scheduledServices'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setScheduledServices(snapshot.docs.map((item: QueryDocumentSnapshot) => item.data() as ScheduledService));
      },
      (error: FirestoreError) => console.error('AutoWise: scheduled services sync failed', error),
    );

    const unsubscribeHistory = onSnapshot(
      query(collection(db, 'users', uid, 'history'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setHistoryItems(snapshot.docs.map((item: QueryDocumentSnapshot) => item.data() as VehicleHistoryItem));
      },
      (error: FirestoreError) => console.error('AutoWise: history sync failed', error),
    );

    const unsubscribeRecords = onSnapshot(
      query(collection(db, 'users', uid, 'records'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setRecords(snapshot.docs.map((item: QueryDocumentSnapshot) => item.data() as VehicleRecord));
      },
      (error: FirestoreError) => console.error('AutoWise: records sync failed', error),
    );

    return () => {
      unsubscribeProfile();
      unsubscribeCars();
      unsubscribeScheduled();
      unsubscribeHistory();
      unsubscribeRecords();
    };
  }, [uid]);

  const value = useMemo(
    () => ({
      profile,
      cars,
      scheduledServices,
      historyItems,
      records,
      isSyncing,
      setProfile: (next: UserProfile) => {
        setProfileState(next);
        if (uid) {
          setDoc(doc(db, 'users', uid), next, { merge: true }).catch((error: FirestoreError) =>
            console.error('AutoWise: failed to save profile', error),
          );
        }
      },
      updateProfile: (changes: Partial<UserProfile>) => {
        setProfileState((current) => ({ ...current, ...changes }));
        if (uid) {
          setDoc(doc(db, 'users', uid), changes, { merge: true }).catch((error: FirestoreError) =>
            console.error('AutoWise: failed to update profile', error),
          );
        }
      },
      addCar: (car: Car) => {
        setCars((current) => [...current, car]);
        if (uid) {
          setDoc(doc(db, 'users', uid, 'cars', car.id), { ...car, createdAt: serverTimestamp() }).catch((error: FirestoreError) =>
            console.error('AutoWise: failed to save car', error),
          );
        }
      },
      updateCar: (id: string, changes: Partial<Omit<Car, 'id'>>) => {
        setCars((current) => current.map((car) => (car.id === id ? { ...car, ...changes } : car)));
        if (uid) {
          setDoc(doc(db, 'users', uid, 'cars', id), changes, { merge: true }).catch((error: FirestoreError) =>
            console.error('AutoWise: failed to update car', error),
          );
        }
      },
      deleteCar: (id: string) => {
        // Removing a car also drops everything tied to it - booked services, history, and
        // records - since none of that makes sense to keep once the car itself is gone.
        const affectedServiceIds = scheduledServices.filter((service) => service.carId === id).map((service) => service.id);
        const affectedHistoryIds = historyItems.filter((item) => item.carId === id).map((item) => item.id);
        const affectedRecordIds = records.filter((record) => record.carId === id).map((record) => record.id);
        const wasPrimary = profile.primaryCarId === id;

        setCars((current) => current.filter((car) => car.id !== id));
        setScheduledServices((current) => current.filter((service) => service.carId !== id));
        setHistoryItems((current) => current.filter((item) => item.carId !== id));
        setRecords((current) => current.filter((record) => record.carId !== id));
        if (wasPrimary) {
          setProfileState((current) => ({ ...current, primaryCarId: '' }));
        }

        if (uid) {
          const batch = writeBatch(db);
          batch.delete(doc(db, 'users', uid, 'cars', id));
          affectedServiceIds.forEach((serviceId) => batch.delete(doc(db, 'users', uid, 'scheduledServices', serviceId)));
          affectedHistoryIds.forEach((historyId) => batch.delete(doc(db, 'users', uid, 'history', historyId)));
          affectedRecordIds.forEach((recordId) => batch.delete(doc(db, 'users', uid, 'records', recordId)));
          if (wasPrimary) {
            batch.set(doc(db, 'users', uid), { primaryCarId: '' }, { merge: true });
          }
          batch.commit().catch((error: FirestoreError) => console.error('AutoWise: failed to delete car', error));
        }
      },
      addScheduledService: (service: ScheduledService) => {
        const historyEntry: VehicleHistoryItem = {
          id: `${service.id}-history`,
          carId: service.carId,
          title: service.title,
          date: service.scheduledDate,
          mileage: service.time,
          status: 'Scheduled',
        };

        // Every new booking starts out waiting for a mechanic to accept it.
        const booking: ScheduledService = { ...service, status: 'pending' };

        setScheduledServices((current) => [booking, ...current]);
        setHistoryItems((current) => [historyEntry, ...current]);

        if (uid) {
          const batch = writeBatch(db);
          batch.set(doc(db, 'users', uid, 'scheduledServices', service.id), { ...booking, createdAt: serverTimestamp() });
          batch.set(doc(db, 'users', uid, 'history', historyEntry.id), { ...historyEntry, createdAt: serverTimestamp() });
          batch.commit().catch((error: FirestoreError) => console.error('AutoWise: failed to save scheduled service', error));
        }
      },
      removeScheduledService: (id: string) => {
        setScheduledServices((current) => current.filter((service) => service.id !== id));
        // Booking a service also creates a linked 'Scheduled' history entry; drop it too.
        setHistoryItems((current) => current.filter((item) => item.id !== `${id}-history`));

        if (uid) {
          const batch = writeBatch(db);
          batch.delete(doc(db, 'users', uid, 'scheduledServices', id));
          batch.delete(doc(db, 'users', uid, 'history', `${id}-history`));
          batch.commit().catch((error: FirestoreError) => console.error('AutoWise: failed to remove scheduled service', error));
        }
      },
      addHistoryItem: (item: VehicleHistoryItem) => {
        setHistoryItems((current) => [item, ...current]);
        if (uid) {
          setDoc(doc(db, 'users', uid, 'history', item.id), { ...item, createdAt: serverTimestamp() }).catch((error: FirestoreError) =>
            console.error('AutoWise: failed to save history item', error),
          );
        }
      },
      deleteHistoryItem: (id: string) => {
        setHistoryItems((current) => current.filter((item) => item.id !== id));
        if (uid) {
          deleteDoc(doc(db, 'users', uid, 'history', id)).catch((error: FirestoreError) =>
            console.error('AutoWise: failed to delete history item', error),
          );
        }
      },
      clearHistoryItems: () => {
        if (uid && historyItems.length > 0) {
          const batch = writeBatch(db);
          historyItems.forEach((item) => batch.delete(doc(db, 'users', uid, 'history', item.id)));
          batch.commit().catch((error: FirestoreError) => console.error('AutoWise: failed to clear history', error));
        }
        setHistoryItems([]);
      },
      addRecord: (record: VehicleRecord) => {
        setRecords((current) => [record, ...current]);
        if (uid) {
          setDoc(doc(db, 'users', uid, 'records', record.id), { ...record, createdAt: serverTimestamp() }).catch((error: FirestoreError) =>
            console.error('AutoWise: failed to save record', error),
          );
        }
      },
      deleteRecord: (id: string) => {
        setRecords((current) => current.filter((record) => record.id !== id));
        if (uid) {
          deleteDoc(doc(db, 'users', uid, 'records', id)).catch((error: FirestoreError) =>
            console.error('AutoWise: failed to delete record', error),
          );
        }
      },
      clearRecordsForCar: (carId: string) => {
        const affectedIds = records.filter((record) => record.carId === carId).map((record) => record.id);

        setRecords((current) => current.filter((record) => record.carId !== carId));

        if (uid && affectedIds.length > 0) {
          const batch = writeBatch(db);
          affectedIds.forEach((recordId) => batch.delete(doc(db, 'users', uid, 'records', recordId)));
          batch.commit().catch((error: FirestoreError) => console.error('AutoWise: failed to clear records', error));
        }
      },
      resetProfileSession: () => {
        // User data now lives in Firestore rather than local state, so there's nothing to wipe here -
        // signing out (see components/auth-provider.tsx) triggers the effect above, which stops
        // syncing and clears the local view without touching what's saved in Firestore.
      },
    }),
    [profile, cars, scheduledServices, historyItems, records, isSyncing, uid],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }

  return context;
}
