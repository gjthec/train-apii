# Firebase configuration (frontend)

This project uses the Firebase Web v9 modular SDK exclusively on the client side. Follow the steps below to set up a development project:

1. **Create a Firebase project** and register a Web App. Copy the client keys into a new `.env.local` file (see `.env.local.example`). All keys must be prefixed with `NEXT_PUBLIC_` so that the browser bundle can read them.
2. **Enable Anonymous authentication** in the Firebase Console under **Authentication → Sign-in method**. The frontend signs in anonymously with local persistence via `requireUid()`.
3. **Add relaxed Firestore rules for development/testing only**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         // Development only: requires any authenticated user (anonymous included)
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   These rules allow any signed-in user (including anonymous sessions) to read and write. Replace them with least-privilege rules before going to production, for example by validating `request.auth.uid` against document paths.

4. **Local development**:

   ```bash
   npm install
   npm run dev
   ```

   The first page load will automatically create (or reuse) an anonymous user and keep it in `localStorage`. Firestore reads run through typed converters under `src/lib/api.ts`.

5. **Production build**:

   ```bash
   npm run build
   npm run start
   ```

   Always run `npm run build` before `npm run start` to avoid stale `.next` artifacts.

## Firebase helpers

The Firebase helpers live in `src/lib/firebase.ts`:

- `getFirebaseApp()` initialises the singleton using environment variables.
- `getDb()` returns the Firestore instance.
- `getClientAuth()` lazily loads `firebase/auth` only on the client.
- `requireUid()` enforces anonymous authentication with `browserLocalPersistence`.

Firestore queries in `src/lib/api.ts` use typed converters to provide minimal runtime validation and prevent `any` leakage into React components.
