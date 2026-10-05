// Shared vocabulary for booked services and checkups, used by the customer screens and the
// mechanic dashboard.
//
//   pending      - booked by the customer, waiting for a mechanic to take it (also what older bookings
//                  without a status count as)
//   accepted     - a mechanic has taken it
//   in_progress  - the mechanic has started work
//   completed    - finished

export type ServiceStatus = 'pending' | 'accepted' | 'in_progress' | 'completed';
export type RequestType = 'service' | 'checkup';

export const requestTypeOptions: { value: RequestType; label: string }[] = [
  { value: 'service', label: 'Service' },
  { value: 'checkup', label: 'Checkup' },
];

export function getServiceStatus(service: { status?: string }): ServiceStatus {
  return service.status === 'accepted' || service.status === 'in_progress' || service.status === 'completed' ? service.status : 'pending';
}

export function getRequestType(service: { requestType?: string }): RequestType {
  return service.requestType === 'checkup' ? 'checkup' : 'service';
}

export function getStatusLabel(status: ServiceStatus): string {
  switch (status) {
    case 'accepted':
      return 'ACCEPTED';
    case 'in_progress':
      return 'IN PROGRESS';
    case 'completed':
      return 'COMPLETED';
    default:
      return 'PENDING';
  }
}

// What the linked entry in the customer's History screen says for each status.
export function getHistoryStatus(status: ServiceStatus): 'Scheduled' | 'In Progress' | 'Completed' {
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  return 'Scheduled';
}
