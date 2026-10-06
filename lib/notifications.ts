import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from '@/lib/firebase';

// Push notifications through Expo's push service.
//
//   1. Each signed-in device registers an Expo push token, saved at /pushTokens/{uid}.
//   2. When something happens that someone should hear about (a mechanic accepts a service, a new
//      chat message), the sending app looks up the other person's token and asks Expo to deliver it.
//
// Sending straight from the app means no server is needed, but it also means anyone allowed to read a
// token (approved mechanics, and people who share a chat) can notify that user - see firestore.rules.
// For a stricter setup, move sendPush into a Cloud Function triggered by the Firestore write.
//
// Needs a development build on Android (Expo Go can't receive remote push since SDK 53) and an EAS
// project id in app.json - see ADMIN_SETUP.md. Everything here fails quietly, so the app works the same
// without push set up.
//
// In Expo Go on Android, remote push is not available (removed in SDK 53), but local notifications
// are. There remotePushSupported is false: no push token is requested (that's the call Expo blocks),
// and instead the phone itself shows a notification when it sees a booking get accepted
// (showLocalNotification, used by components/service-update-banner.tsx). That works while the app is
// open or recently in the background - not when it has been closed. On the web there are no system
// notifications, so an in-app banner is used. 'expo-notifications' is loaded lazily so the web build and
// anything that never notifies doesn't pull it in.

type Notifications = typeof NotificationsModule;

const isNative = Platform.OS !== 'web';
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const remotePushSupported = isNative && !(isExpoGo && Platform.OS === 'android');
export const isNativeApp = isNative;

let loaded: Notifications | null | undefined;

// The expo-notifications module on phones (null on the web). Safe in Expo Go for local notifications.
export function loadNotificationsModule(): Notifications | null {
  if (!isNative) {
    return null;
  }

  if (loaded === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const module = require('expo-notifications') as Notifications;
      module.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      loaded = module;
    } catch (error) {
      console.warn('AutoWise: expo-notifications is not available', error);
      loaded = null;
    }
  }

  return loaded;
}

// The module only where remote push works (development builds, iOS, production apps).
export function getNotifications(): Notifications | null {
  return remotePushSupported ? loadNotificationsModule() : null;
}

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

// Asks permission, gets this device's push token and saves it for the signed-in user.
export async function registerForPush(uid: string): Promise<string | null> {
  const Notifications = getNotifications();

  if (!Notifications) {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'AutoWise',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;

    if (!granted) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }

    if (!granted) {
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn('AutoWise: push notifications are off - run `eas init` to add an EAS project id to app.json (see ADMIN_SETUP.md).');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await setDoc(doc(db, 'pushTokens', uid), { token, platform: Platform.OS, updatedAt: serverTimestamp() });

    return token;
  } catch (error) {
    console.warn('AutoWise: push registration skipped', error);
    return null;
  }
}

// Shows a notification on this phone right now, without any server. Works in Expo Go on Android.
// Returns false (so the caller can fall back to an in-app banner) if notifications aren't available
// or the person hasn't allowed them.
export async function showLocalNotification(payload: PushPayload): Promise<boolean> {
  const Notifications = loadNotificationsModule();

  if (!Notifications) {
    return false;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'AutoWise',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    let granted = (await Notifications.getPermissionsAsync()).granted;

    if (!granted) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }

    if (!granted) {
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: { title: payload.title, body: payload.body, data: payload.data ?? {} },
      trigger: null,
    });

    return true;
  } catch (error) {
    console.warn('AutoWise: could not show local notification', error);
    return false;
  }
}

// Removes this user's token so a signed-out device stops receiving their notifications.
export async function unregisterPush(uid: string) {
  try {
    await deleteDoc(doc(db, 'pushTokens', uid));
  } catch {
    // Nothing to clean up, or offline - not worth blocking sign-out for.
  }
}

// Sends a notification to another user's registered device. Never throws.
export async function sendPush(toUid: string, payload: PushPayload) {
  try {
    const snapshot = await getDoc(doc(db, 'pushTokens', toUid));
    const token = snapshot.data()?.token;

    if (typeof token !== 'string' || !token.startsWith('ExponentPushToken')) {
      return;
    }

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: 'default',
        channelId: 'default',
        priority: 'high',
      }),
    });
  } catch (error) {
    console.warn('AutoWise: could not send push notification', error);
  }
}
