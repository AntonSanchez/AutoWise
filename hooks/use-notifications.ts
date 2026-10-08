import { useMemo } from 'react';

import { formatMessageTime, useMessages } from '@/components/messages-provider';
import { getNextMaintenanceRecommendation, useProfile } from '@/components/profile-provider';
import { useThemeColors } from '@/components/theme-provider';
import { getRequestType, getServiceStatus } from '@/lib/service-status';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  icon: string;
  tone: string;
  unread: boolean;
  carId?: string;
  // Where tapping it goes; defaults to the car.
  href?: string;
};

// The customer's notifications: updates from mechanics on their bookings plus maintenance reminders.
// Cleared ones are remembered on the profile (clearedNotifications) so they stay gone on every device,
// and come back only if something about them changes (a new status gets a new id).
export function useNotifications() {
  const colors = useThemeColors();
  const { cars, profile, scheduledServices, updateProfile } = useProfile();
  const { conversations } = useMessages();
  const primaryCar = cars.find((car) => car.id === profile.primaryCarId) ?? cars[0];
  const cleared = useMemo(() => new Set(profile.clearedNotifications ?? []), [profile.clearedNotifications]);

  const all = useMemo<NotificationItem[]>(() => {
    const nextService = getNextMaintenanceRecommendation(primaryCar?.odometer ?? '0');
    const items: NotificationItem[] = scheduledServices
      .filter((service) => getServiceStatus(service) !== 'pending')
      .map((service) => {
        const status = getServiceStatus(service);
        const kind = getRequestType(service) === 'checkup' ? 'Checkup' : 'Service';
        const verb = status === 'completed' ? 'completed' : status === 'in_progress' ? 'in progress' : 'accepted';

        return {
          id: `service-${service.id}-${status}`,
          title: `${kind} ${verb}: ${service.title}`,
          message: `${service.mechanicName || 'A mechanic'} ${
            status === 'completed' ? 'finished' : status === 'in_progress' ? 'started work on' : 'accepted'
          } your ${kind.toLowerCase()} for ${service.vehicle} on ${service.scheduledDate} at ${service.time}.`,
          time: service.scheduledDate,
          icon: status === 'completed' ? 'checkmark-done-outline' : 'construct-outline',
          tone: status === 'completed' ? colors.green : colors.gold,
          unread: status !== 'completed',
          carId: service.carId,
        };
      });

    // Maintenance reminders only make sense once there is a car to remind about.
    if (primaryCar) {
      items.push({
        id: `maintenance-${primaryCar.id}-${nextService.title}-${nextService.status}`,
        title: `${nextService.title} status: ${nextService.status}`,
        message: `Recommended action: ${nextService.action}. ${nextService.dueIn.toLocaleString()} km remaining until the next check window.`,
        time: 'Today',
        icon: nextService.icon,
        tone: colors.gold,
        unread: true,
        carId: primaryCar.id,
      });
    }

    // Unread chat messages, except from chats the customer muted.
    conversations
      .filter((conversation) => conversation.unread && !conversation.muted && conversation.lastMessage.length > 0)
      .forEach((conversation) =>
        items.unshift({
          id: `message-${conversation.id}-${conversation.lastMessageAtMs}`,
          title: `New message from ${conversation.name}`,
          message: conversation.lastMessage,
          time: formatMessageTime(conversation.lastMessageAtMs),
          icon: 'chatbubble-ellipses-outline',
          tone: colors.gold,
          unread: true,
          href: `/message/${conversation.id}`,
        }),
      );

    return items;
  }, [scheduledServices, primaryCar, conversations, colors]);

  const notifications = useMemo(() => all.filter((item) => !cleared.has(item.id)), [all, cleared]);

  return {
    notifications,
    unreadCount: notifications.filter((item) => item.unread).length,
    primaryCar,
    clearAll: () => updateProfile({ clearedNotifications: [...cleared, ...notifications.map((item) => item.id)].slice(-200) }),
    clearOne: (id: string) => updateProfile({ clearedNotifications: [...cleared, id].slice(-200) }),
  };
}
