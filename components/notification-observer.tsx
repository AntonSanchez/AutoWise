import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/components/auth-provider';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';

// Opens the right screen when someone taps a push notification (also when it launched the app).
// Not rendered on web, where there are no push notifications.
export function NotificationObserver() {
  const { isLoggedIn } = useAuth();
  const navigate = useSafeNavigation(false);
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }

    const id = response.notification.request.identifier;

    if (handled.current === id) {
      return;
    }

    handled.current = id;
    const data = response.notification.request.content.data as { type?: string; conversationId?: string; carId?: string };

    if (data.type === 'message' && data.conversationId) {
      navigate(`/message/${data.conversationId}`);
    } else if (data.type === 'service' && data.carId) {
      navigate(`/car/${data.carId}`);
    }
  }, [isLoggedIn, response, navigate]);

  return null;
}
