# Firebase configuration (frontend)

This project uses the Firebase Web v9 modular SDK exclusively on the client side. Follow the steps below to set up a development project:

1. **Create a Firebase project** and register a Web App. Copy the client keys into a new `.env.local` file (see `.env.local.example`). All keys must be prefixed with `NEXT_PUBLIC_` so that the browser bundle can read them.
2. **Enable authentication providers** in the Firebase Console under **Authentication → Sign-in method**:
   - **Anonymous** keeps backwards compatibility — the frontend still signs in automatically via `requireUid()` so existing pages load without manual login.
   - **Google** powers the `/login` screen. It links the current session (anonymous or not) to a Google account, persists the profile under `users/{uid}` and reuses it on the next visits.
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

   The first page load will automatically create (or reuse) an anonymous user and keep it in `localStorage`. Upgrade that session to a Google account em `/login` clicando em “Entrar com Google”. Firestore reads run through typed converters under `src/lib/api.ts` and profiles are synced to `users/{uid}`.

5. **Production build**:

   ```bash
   npm run build
   npm run start
   ```

   Always run `npm run build` before `npm run start` to avoid stale `.next` artifacts.

## Firebase Hosting

The repository already includes the Firebase Hosting configuration files in the monorepo root (`firebase.json` and `.firebaserc`).

1. **Install the Firebase CLI** (globally) if you have not yet:

   ```bash
   npm install -g firebase-tools
   ```

2. **Select your Firebase project** by editing `.firebaserc` or running `firebase use --add` so the `default` entry points to the project that will host the app.

3. **Build the static export that Hosting serves**. Inside `frontend/` run:

   ```bash
   npm run build:hosting
   ```

   This runs `next build` followed by `next export` and generates the `out/` folder that matches the `public` directory configured in `firebase.json`.

4. **Deploy to Firebase Hosting** with your preferred command. Either call the CLI directly:

   ```bash
   firebase deploy --only hosting
   ```

   or reuse the npm script that chains the build and deploy steps:

   ```bash
   npm run deploy:hosting
   ```

5. **Optional – preview locally** before deploying using the Hosting emulator:

   ```bash
   firebase emulators:start --only hosting
   ```

   The emulator serves the contents of `frontend/out` so you can validate routes and assets prior to publishing.

## Firebase helpers

The Firebase helpers live in `src/lib/firebase.ts`:

- `getFirebaseApp()` initialises the singleton using environment variables.
- `getDb()` returns the Firestore instance.
- `getClientAuth()` lazily loads `firebase/auth` only on the client.
- `requireUid()` enforces anonymous authentication with `browserLocalPersistence` and persists user metadata in Firestore.
- `signInWithGoogle()` upgrades or creates sessions and keeps the user profile up to date in `users/{uid}`.

Firestore queries in `src/lib/api.ts` use typed converters to provide minimal runtime validation and prevent `any` leakage into React components.
