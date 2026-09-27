# Firebase setup

AutoWise's login and data (profile, booked services, history) now run on Firebase
Authentication and Firestore. You need your own Firebase project - the app won't
connect to anyone else's data.

## 1. Create the project

1. Go to https://console.firebase.google.com and click **Add project**.
2. Name it (e.g. "AutoWise"), and you can disable Google Analytics unless you want it.

## 2. Register a Web app

Even though AutoWise is an Expo/React Native app, it uses Firebase's **Web SDK**,
so register a Web app:

1. In the project overview, click the **</>** (Web) icon.
2. Give it a nickname and click **Register app**. Don't check "Firebase Hosting".
3. Firebase shows a `firebaseConfig` object with your keys - keep this page open.

## 3. Turn on Authentication

1. In the left sidebar, go to **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.

## 4. Turn on Firestore

1. Go to **Build → Firestore Database → Create database**.
2. Choose a location close to your users, and start in **production mode**.
3. Once created, open the **Rules** tab. It shows an editor with Firebase's default
   rules already in it (something like `allow read, write: if false;`). Select all
   of that text and delete it, then paste in the entire contents of `firestore.rules`
   from this project, and click **Publish**. This is what stops one user from
   reading or writing another user's data.

That's the only Firebase service AutoWise needs - profile pictures are resized and
saved directly on the Firestore profile document, so there's no Storage bucket to
set up and nothing that requires Firebase's paid Blaze plan.

## 5. Add your config to the app

1. Copy `.env.example` to a new file named `.env` in the project root.
2. Fill in each value from the `firebaseConfig` object from step 2:

   | .env key | firebaseConfig key |
   |---|---|
   | `EXPO_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
   | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
   | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
   | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `EXPO_PUBLIC_FIREBASE_APP_ID` | `appId` |

3. Install the new dependencies and start with a clean cache:

   ```
   npm install
   npx expo install expo-image-picker expo-image-manipulator
   npx expo start -c
   ```

   `npx expo install` (rather than a plain `npm install`) is what picks the
   exact package versions that match this project's Expo SDK, so don't swap in
   hand-picked version numbers.

These are the same "web app" keys Firebase's own docs describe as safe to ship in a
client app - they identify your project, they don't grant access. Access control is
what `firestore.rules` does.

## What's now backed by Firebase

- **Sign up / sign in / sign out** - real accounts (`components/auth-provider.tsx`).
- **Cars, booked services, history, and records** - all saved per-account in Firestore
  and kept in sync in real time (`components/profile-provider.tsx`), instead of
  resetting every time the app restarts. Deleting a car cascades to its services,
  history, and records too.
- **Primary car** - the car marked with the star on the Cars tab, saved to your
  profile so Home always opens on the right vehicle.
- **Profile picture** - taken with the camera or picked from the photo library,
  shrunk and compressed on the device, then saved as part of the same per-account
  Firestore profile document (no separate file storage or billing plan involved).
- A new sign-up creates an empty Firestore record for that user; nothing is shared
  between accounts.

## Known limits

- No Google/Apple sign-in, password reset, or email verification yet - email/password
  only.
- No offline queue: if a write fails (e.g. no network), it's only logged to the
  console right now, not retried or shown to the user.
- Profile pictures are shrunk to 240px and compressed before saving, so they'll look
  fine as an avatar but aren't full-resolution photos - that's the tradeoff for
  storing them on the profile document instead of a separate file store.
