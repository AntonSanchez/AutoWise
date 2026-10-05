import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
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

const isNative = Platform.OS !== 'web';

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

// Asks permission, gets this device's push token and saves it for the signed-in user.
export async function registerForPush(uid: string): Promise<string | null> {
  if (!isNative) {
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
