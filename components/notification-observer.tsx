import { useEffect, useRef } from 'react';

import { useAuth } from '@/components/auth-provider';
import { useSafeNavigation } from '@/hooks/use-safe-navigation';
import { isNativeApp, loadNotificationsModule } from '@/lib/notifications';

// Opens the right screen when someone taps a notification (push or local, also when it launched the app).
// Renders nothing on the web.
export function NotificationObserver() {
  return isNativeApp ? <Observer /> : null;
}

function Observer() {
  const Notifications = loadNotificationsModule();

  // Only rendered when the module exists, so this never changes between renders.
  return Notifications ? <ResponseHandler Notifications={Notifications} /> : null;
}

function ResponseHandler({ Notifications }: { Notifications: NonNullable<ReturnType<typeof loadNotificationsModule>> }) {
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
  }, [Notifications, isLoggedIn, response, navigate]);

  return null;
}
