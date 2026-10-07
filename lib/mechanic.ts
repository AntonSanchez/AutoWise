import {
  collectionGroup,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';

import type { ScheduledService } from '@/components/profile-provider';
import { db } from '@/lib/firebase';
import { sendPush } from '@/lib/notifications';
import { formatFee } from '@/lib/service-status';

// Everything in here only works for approved mechanics: firestore.rules is what enforces that.
// Anyone else calling these just gets "permission denied" from Firestore.

export type ServiceRequest = ScheduledService & {
  // Which customer's garage this booking lives in (users/{customerId}/scheduledServices/{id}).
  customerId: string;
  createdAtMs: number;
};

// Live list of every booked service and checkup across all customers. This is one collection-group
// query with no filters, which needs no Firestore index; the app filters and sorts it locally.
export function subscribeServiceRequests(onData: (requests: ServiceRequest[]) => void, onError: (error: FirestoreError) => void): Unsubscribe {
  return onSnapshot(
    collectionGroup(db, 'scheduledServices'),
    (snapshot) => {
      const requests: ServiceRequest[] = [];

      snapshot.docs.forEach((item) => {
        const customerId = item.ref.parent.parent?.id;

        if (!customerId) {
          return;
        }

        const data = item.data() as ScheduledService & { createdAt?: { toMillis?: () => number } };
        const createdAtMs = typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : 0;

        requests.push({ ...data, id: item.id, customerId, createdAtMs });
      });

      onData(requests);
    },
    onError,
  );
}

type HistoryStatus = 'Scheduled' | 'In Progress' | 'Completed';

// Updates the booking itself, and keeps the matching entry on the customer's History screen in step.
// The two writes go together in one batch. Bookings whose history entry was deleted by the customer
// would make that batch fail, so in that case the booking is updated on its own.
async function respond(request: ServiceRequest, changes: Record<string, unknown>, historyStatus?: HistoryStatus) {
  const serviceRef = doc(db, 'users', request.customerId, 'scheduledServices', request.id);

  if (historyStatus) {
    try {
      const batch = writeBatch(db);
      batch.update(serviceRef, changes);
      batch.update(doc(db, 'users', request.customerId, 'history', `${request.id}-history`), { status: historyStatus });
      await batch.commit();
      return;
    } catch {
      // Fall through and try the booking alone; if that is refused too, the error surfaces below.
    }
  }

  await updateDoc(serviceRef, changes);
}

export async function acceptRequest(request: ServiceRequest, mechanic: { uid: string; name: string }) {
  await respond(request, {
    status: 'accepted',
    mechanicId: mechanic.uid,
    mechanicName: mechanic.name,
    respondedAt: serverTimestamp(),
  });

  // Let the customer know right away. This never throws and doesn't hold up the accept.
  const kind = request.requestType === 'checkup' ? 'checkup' : 'service';
  void sendPush(request.customerId, {
    title: `Your ${kind} was accepted`,
    body: `${mechanic.name} accepted your ${request.title.toLowerCase()} ${kind} for ${request.scheduledDate} at ${request.time}.`,
    data: { type: 'service', carId: request.carId, serviceId: request.id },
  });
}

export function startRequest(request: ServiceRequest) {
  return respond(request, { status: 'in_progress' }, 'In Progress');
}

// Marks the job done and automatically logs it in the customer's Records for that car
// (users/{customerId}/records/{serviceId}-record), so nobody has to type it in by hand.
export async function completeRequest(request: ServiceRequest, mechanicName?: string) {
  const customerRef = (name: string, id: string) => doc(db, 'users', request.customerId, name, id);
  const serviceRef = customerRef('scheduledServices', request.id);
  const kind = request.requestType === 'checkup' ? 'Checkup' : 'Service';
  const now = new Date();
  const completedOn = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
  const fee = formatFee(request.fee);
  const by = mechanicName || request.mechanicName || 'a mechanic';
  const record = {
    id: `${request.id}-record`,
    carId: request.carId,
    title: `${request.title} (${kind})`,
    value: fee ? `Fee ${fee}` : `Completed ${completedOn}`,
    detail: `${kind} completed by ${by} on ${completedOn} for ${request.vehicle}. It was booked for ${request.scheduledDate} at ${request.time}.${fee ? ` Fee: ${fee}.` : ''}`,
    source: 'mechanic',
    createdAt: serverTimestamp(),
  };
  const changes = { status: 'completed', completedAt: serverTimestamp() };

  // Best case: booking + History entry + Record in one go. If the customer deleted the History
  // entry (or the Record already exists) that batch is refused, so fall back to smaller ones and
  // finally to the booking alone, which must always succeed for the mechanic.
  const attempts: ((batch: ReturnType<typeof writeBatch>) => void)[] = [
    (batch) => {
      batch.update(serviceRef, changes);
      batch.update(customerRef('history', `${request.id}-history`), { status: 'Completed' });
      batch.set(customerRef('records', record.id), record);
    },
    (batch) => {
      batch.update(serviceRef, changes);
      batch.set(customerRef('records', record.id), record);
    },
    (batch) => {
      batch.update(serviceRef, changes);
      batch.update(customerRef('history', `${request.id}-history`), { status: 'Completed' });
    },
  ];

  for (const build of attempts) {
    try {
      const batch = writeBatch(db);
      build(batch);
      await batch.commit();
      return;
    } catch {
      // try the next, smaller attempt
    }
  }

  await updateDoc(serviceRef, changes);
}

// Hands a job back so another mechanic can take it.
export function releaseRequest(request: ServiceRequest) {
  return respond(request, { status: 'pending', mechanicId: '', mechanicName: '' }, 'Scheduled');
}

export function describeMechanicError(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';

  if (code === 'permission-denied') {
    return `${fallback} Another mechanic may have just taken it, the customer may have removed it, or your account isn't approved yet.`;
  }

  if (code === 'unavailable') {
    return `${fallback} Check your connection and try again.`;
  }

  return fallback;
}
