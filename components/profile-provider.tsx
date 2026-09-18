import React, { createContext, useContext, useMemo, useState } from 'react';

export type VehicleProfile = {
  ownerName: string;
  vehicleName: string;
  vehicleModel: string;
  odometer: string;
  purchaseDate: string;
  insurance: string;
  servicePlan: string;
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
  title: string;
  vehicle: string;
  targetMileage: string;
  scheduledDate: string;
  notes: string;
};

export type VehicleHistoryItem = {
  id: string;
  title: string;
  date: string;
  mileage: string;
  status: 'Completed' | 'Scheduled' | 'In Progress';
};

export const defaultProfile: VehicleProfile = {
  ownerName: 'Joe',
  vehicleName: '2023 Hatchback 1.2L Turbo',
  vehicleModel: 'Hyundai Accent',
  odometer: '42,000 km',
  purchaseDate: 'Apr 14, 2023',
  insurance: 'ABC Auto Insurance',
  servicePlan: 'Every 5,000 km',
};

export const defaultScheduledServices: ScheduledService[] = [
  {
    id: 'default-oil-service',
    title: 'Oil & Filter Change',
    vehicle: defaultProfile.vehicleName,
    targetMileage: '45,000 km',
    scheduledDate: 'Nov 28, 2024',
    notes: 'Full synthetic 0W-20 and OEM filter recommended.',
  },
];

export const defaultHistoryItems: VehicleHistoryItem[] = [
  {
    id: 'history-oil-change',
    title: 'Oil & Filter Change',
    date: 'Apr 14, 2024',
    mileage: '42,400 km',
    status: 'Completed',
  },
  {
    id: 'history-brake-pads',
    title: 'Brake Pad Replacement',
    date: 'Jan 08, 2024',
    mileage: '39,120 km',
    status: 'Completed',
  },
  {
    id: 'history-tire-rotation',
    title: 'Tire Rotation',
    date: 'Nov 21, 2023',
    mileage: '35,800 km',
    status: 'Completed',
  },
  {
    id: 'history-battery-check',
    title: 'Battery Check',
    date: 'Sep 15, 2023',
    mileage: '31,900 km',
    status: 'Completed',
  },
];

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
  profile: VehicleProfile;
  scheduledServices: ScheduledService[];
  historyItems: VehicleHistoryItem[];
  setProfile: (profile: VehicleProfile) => void;
  updateProfile: (changes: Partial<VehicleProfile>) => void;
  addScheduledService: (service: ScheduledService) => void;
  addHistoryItem: (item: VehicleHistoryItem) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistoryItems: () => void;
  resetProfileSession: () => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<VehicleProfile>(defaultProfile);
  const [scheduledServices, setScheduledServices] = useState<ScheduledService[]>(defaultScheduledServices);
  const [historyItems, setHistoryItems] = useState<VehicleHistoryItem[]>(defaultHistoryItems);

  const value = useMemo(
    () => ({
      profile,
      scheduledServices,
      historyItems,
      setProfile,
      updateProfile: (changes: Partial<VehicleProfile>) => {
        setProfile((current) => ({ ...current, ...changes }));
      },
      addScheduledService: (service: ScheduledService) => {
        setScheduledServices((current) => [service, ...current]);
        setHistoryItems((current) => [
          {
            id: `${service.id}-history`,
            title: service.title,
            date: service.scheduledDate,
            mileage: service.targetMileage,
            status: 'Scheduled',
          },
          ...current,
        ]);
      },
      addHistoryItem: (item: VehicleHistoryItem) => {
        setHistoryItems((current) => [item, ...current]);
      },
      deleteHistoryItem: (id: string) => {
        setHistoryItems((current) => current.filter((item) => item.id !== id));
      },
      clearHistoryItems: () => {
        setHistoryItems([]);
      },
      resetProfileSession: () => {
        setProfile(defaultProfile);
        setScheduledServices(defaultScheduledServices);
        setHistoryItems(defaultHistoryItems);
      },
    }),
    [profile, scheduledServices, historyItems],
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
