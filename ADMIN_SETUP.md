# Admin accounts

Admins can see every account, edit profiles, disable/enable accounts, send password
reset emails, delete an account's data, and add / edit / delete the cars inside any
account.

## How someone becomes an admin

An admin is any user who has a document in the Firestore `admins` collection, where the
**document ID is that user's UID**. For safety, this can only be done by hand in the
Firebase console - the app (and firestore.rules) will never let anyone make themselves
or anyone else an admin.

1. **Publish the new rules.** Firebase console → Firestore Database → Rules → replace
   everything with the contents of `firestore.rules` → **Publish**.
   (Skip this and the admin screens will show "permission denied".)
2. **Create the account** you want to be admin - just sign up normally in the app.
3. **Find its UID:** Firebase console → Authentication → Users → copy the *User UID*.
4. **Create the admin document:** Firestore Database → Data → **Start collection**
   (or *Add document* if `admins` exists already):
   - Collection ID: `admins`
   - Document ID: *paste the UID*
   - Add any one field, e.g. `role` (string) = `admin`  (Firestore needs at least one field)
5. Sign out and back in. **Settings → Administration** now appears for that account.

To remove admin rights, delete that document.

## What admins can do

| Action | Where |
|---|---|
| See all accounts, search by name / email / phone / ID | Settings → Administration |
| Edit a user's name and phone | Account screen → pencil icon |
| Send a password reset email | Account screen → Account actions |
| Disable / enable an account | Account screen → Account actions |
| Delete an account's data (cars, services, history, records) | Account screen → Account actions |
| Add / edit / delete cars in that account | Account screen → Cars |

- **Disabled** accounts are signed out immediately (even mid-session) and can't sign back
  in to use the app until re-enabled. Their data is kept. This is enforced by
  `firestore.rules`, not just the UI.
- Deleting a car also deletes that car's booked services, history and records, the same
  as when a user deletes their own car.
- Admins can't disable or delete themselves or other admins from the app.

## Mechanic accounts

On the login and sign-up screens, people choose **Customer** or **Mechanic**.

- **Signing up as a mechanic** creates the account, but it can't do anything yet. The mechanic
  sees a "Waiting for approval" screen.
- **Approving:** Settings → Administration → open the account (filter **Pending** shows only
  mechanics waiting) → **Approve mechanic**. The mechanic's screen switches to the dashboard on
  its own, no re-login needed. **Revoke mechanic approval** takes it away again.
- Approval is enforced by `firestore.rules`: only admins can set it, and nobody can approve
  themselves, so signing up as a mechanic gives no access to customer data on its own.
- **Signing in:** the Customer / Mechanic button has to match the account. Choosing the wrong
  one is refused with a message saying which to pick. Roles are fixed at sign-up; to change one,
  edit the `role` field ("customer" or "mechanic") on that user's document in the console.

### What an approved mechanic can do

| Action | Where |
|---|---|
| See open service and checkup requests from all customers | Home → Requests |
| Filter by All / Services / Checkups | Home |
| Accept a request (it becomes theirs) | Requests → Accept |
| Start work, mark completed, or release a job back to the pool | Home → My jobs |
| See finished jobs | Home → Completed |

- Customers choose **Service** or **Checkup** when booking (Car → Book Services). Older
  bookings count as Services waiting for a mechanic.
- Customers see the status on their car's Schedule tab (Pending, Accepted, In progress,
  Completed, plus the mechanic's name), and the matching entry on the History screen changes
  to In Progress / Completed.
- Only one mechanic can accept a request; if two tap at the same moment the second gets a
  friendly "another mechanic may have just taken it" message.
- Mechanics can read every customer's booked services (title, vehicle, customer name, date,
  notes). They cannot read customers' profiles, cars, records, or phone numbers, and they can
  only change the response fields (status, mechanic, timestamps) of a booking.

## Messages

The Messages tab works for both customers and mechanics (mechanics get Home / Messages / Account
tabs at the bottom).

- **Customer → mechanic:** after a mechanic accepts a booking, open the car → Schedule tab and tap
  **Message mechanic** on that booking.
- **Mechanic → customer:** on a job under My jobs tap the chat icon, or **Message customer** on a
  completed job.
- Each pair of people shares one chat, so chatting again from another booking continues the same thread.
- Unread chats get a gold outline and a dot, and the Messages tab shows an unread count.
- **Anyone can message anyone, including customer to customer.** On the Messages tab tap **New message**,
  type the other person's email address, and tap **Start chat**. People can only be found by their exact
  email: there is no list of users to browse, so nobody can look through the accounts. The lookup says whether
  an account exists for an email, so don't treat emails as secret from other signed-in users.
- Accounts appear in that lookup once they have opened the app after this update (it publishes their name
  and role under their email), so older accounts need to sign in once. Deleting an account's data in the
  admin screen removes it from the lookup.
- Only the two people in a chat can read it, and sent messages can't be edited or deleted (enforced in
  `firestore.rules`). Admins can't read chats either.
- In the chat, **Enter sends** (Shift+Enter makes a new line on the web), and the keyboard no longer covers
  the message box.
- Chats appear in the list once the first message is sent.

## Push notifications

- A customer gets a push when a mechanic **accepts** their service or checkup, and either person
  gets one for a **new chat message**. Tapping it opens the car or the chat.
- Customers also see accepted / in-progress / completed updates on the **Notifications** screen,
  with or without push set up.
- Devices register a token on sign-in (saved at `pushTokens/{uid}`, removed on sign-out). The sending
  app asks Expo's push service to deliver, so no server is needed.

**Expo Go on Android can't do remote push** (removed in SDK 53, still true in SDK 54), so Expo Go can't
get a notification while the app is closed. What it does instead: when a mechanic accepts a booking and the
customer's app is open (or recently in the background), the phone shows a normal system notification, or an
in-app banner on the web or if notifications aren't allowed. The app never asks Expo Go for a push token, which
is the call Expo blocks. Real push, including when the app is fully closed, needs a **development build**:

1. `npm install`
2. `npm install -g eas-cli`, then `eas login`
3. `npx expo install expo-dev-client`
4. `eas init` (adds your EAS project id to `app.json`) and `eas build:configure` (creates `eas.json`
   with a development profile)
5. **Firebase for Android:** in the Firebase console add an Android app with package name
   `com.kadong.AutoWise` (the one in `app.json`), download `google-services.json` into the project
   root, and add `"googleServicesFile": "./google-services.json"` under `"android"` in `app.json`.
6. **Send permission:** Firebase console → Project settings → Service accounts → Generate new private
   key, then run `eas credentials`, choose Android → your profile → Google Service Account → FCM V1,
   and upload that JSON (guide: https://docs.expo.dev/push-notifications/fcm-credentials/).
7. Build and install the development app:
   `eas build --profile development --platform android`, then install the APK it gives you.
8. Run `npx expo start --dev-client` and open the project in that installed app instead of Expo Go.
9. Test: customer on one device, approved mechanic on another, book a service, accept it.

iPhones need Apple developer credentials for push on a real device (Expo Go on iOS can still receive it).

Push limits: anyone who can read a user's token (approved mechanics, and people who share a chat with
them) can send them a notification, because sending happens from the app. For a stricter setup,
move `sendPush` in `lib/notifications.ts` into a Cloud Function that fires when a booking or message
is written (needs Firebase's Blaze plan). Notifications can't be sent to the web version.

## Limits worth knowing

- **The sign-in itself can't be deleted from inside the app.** Removing a user from
  Firebase Authentication needs the Firebase console (Authentication → Users → ⋮ →
  Delete) or a Cloud Function using the Admin SDK. "Delete account data" wipes
  everything the account owns and disables it, so that login can't get back into the
  app, but the entry remains in the Authentication list until you delete it there.
- **Emails appear once a user has signed in.** Firebase Auth emails aren't readable from
  the client, so the app copies each user's email onto their profile at sign-up / next
  sign-in. Older accounts show "No email on file yet" until they sign in once.
- **Mechanic requests are loaded with one unfiltered query** across all customers and filtered on
  the phone. That's fine for a small shop or a school project; if the app grows large, switch to
  a filtered collection-group query (Firestore will give you a one-click link to create the index).
- **No push notifications.** Customers see a status change next time they open the app; mechanics
  see new requests appear live while the dashboard is open.
- The new rules use `let`, `get()` and a collection-group rule that can't be tested here. After
  publishing, try booking as a customer, accepting as an approved mechanic, and accepting as an
  unapproved one (which should be refused). The Rules Playground in the Firebase console is
  handy for this.
- Because disabled-account checks read the user's profile, each protected read costs one
  extra Firestore document read. That's small, but it is there.

## Pictures

- Profile pictures (customers via Profile, mechanics via Mechanic account) show at the top-left of the header and next to every account in the admin list and detail screens.
- Cars have an optional "Add a picture" on the Add/Edit Car form; it shows in the car list (and the admin car list). Pictures are stored as small compressed images on the Firestore document, so no Firebase Storage is needed and no rules changes are required.

## Completed services become records

- When a mechanic taps Complete, the customer automatically gets a Record for that car ("<service> (Service|Checkup)", completed date, who did it). The History entry flips to Completed too.
- The Home screen "Upcoming appointment" card lists every booked service and checkup that is not yet completed, soonest first, with its status.
- **Republish `firestore.rules`** - it has a new rule letting the mechanic who owns the job create that record.

## Fees, editing and requests

- Booking a checkup sets a flat fee of 100 pesos automatically; for a service the customer types how much they want to pay. The fee shows on the car schedule, on Home, on the mechanic request cards and in the automatic record.
- Customers can edit a booking (pencil icon on the car Schedule tab) while it is still Pending.
- Mechanics get a message button next to Accept on each request.
- The Add Record value hint now uses pesos.
- No rules change is needed for this update.
