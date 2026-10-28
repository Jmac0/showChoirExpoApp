# Show Choir app

Expo (React Native) app for Show Choir members and welcome assistants (GAs). It has no backend of its own – everything comes from the website's API in the sibling repo `../showchoirwebsite` (`src/pages/api/...`).

## Commands

- `npx expo start -c` – start Metro (clear cache after adding packages). The app runs in **Expo Go** on a phone – there's no dev client, no `ios`/`android` folders and no Xcode on this Mac.
- `npm run lint` – ESLint (includes the React Compiler / react-hooks rules). `npx tsc --noEmit` – typecheck.
- The website must be running (`npm run dev` there) for the app to work locally.
- Builds: EAS in the cloud (Expo project `@jmac0/show-choir`, Android keystore on Expo). `eas.json` profiles: **preview** = installable Android APK pointing at the website's Vercel dev preview (`npx eas-cli build -p android --profile preview`, install from the link on the phone); **production** = store builds against `https://www.show-choir.co.uk` (`eas build -p ios`, `eas submit -p ios`). Lock-screen controls / background playback only work in these builds, not Expo Go. The Vercel Preview env needs every variable the app uses (e.g. `JWT_SECRET`).

## How it fits together

- **Routing**: expo-router, `src/app/`. `login.tsx` outside the tabs; tabs in `src/app/(app)/`: `index` (home, membership card, flexi ring), `notifications`, `resources` (Music & Lyrics), `account` (membership details, change password & email, log out, delete account – Apple requires in-app deletion), and for GAs `scan` (QR check-in), `here` (who's here, incl. tasters) and `tasters` (taster bookings – tap to check in, long-press to undo, Email sends the follow-up "how to join" email) – these are **not in the tab bar** (`href: null`) but in the staff menu (`components/StaffMenu.tsx`: menu button top right, drawer; items listed with the roles that see them – add admin screens there).
- **API**: always use `api` / `authRequest` from `src/lib/api.ts` and `src/contexts/authContext.tsx`, not plain axios. In development the website address is worked out from the Mac's IP (Expo's `hostUri`) on port 3000; release builds use `EXPO_PUBLIC_BASE_URL` (from `eas.json`). With `npx expo start --tunnel` (public wifi that blocks phone↔Mac) there's no Mac IP, so the app uses `.env.local`'s `EXPO_PUBLIC_BASE_URL` – set to the website's Vercel dev preview, since the tunnel only carries the app code, not API requests.
- **Auth**: JWT access token + refresh token from the website (`api/auth/appLogin`, `api/auth/refresh`). Refresh token in `expo-secure-store` (localStorage on web). Role from the profile (`role === 'ga'` shows GA tabs).
- **Flexi members brought over from paper**: the website answers a scan with `confirm_sessions` until their sessions are entered - `scan.tsx` opens `ConfirmSessionsSheet` (GA types the paper count), posts `confirm-flexi-sessions`, then checks them in again. Home shows "to be confirmed" while `flexi_sessions_confirmed === false`.
- **Rehearsal / venue** for GA check-ins: `src/contexts/rehearsalContext.tsx` (AsyncStorage).
- **Music**: `get-app-music` returns songs with 1-hour signed links (fetched on focus, pull to refresh). One `expo-audio` player per screen, `ScrubBar` for seeking; PDFs open with `Linking` or are shared via `expo-file-system` + `expo-sharing`.
- **Types** mirror the website's (comments say which file) – change both sides together.

## Gotchas

- **Only packages included in Expo Go** unless we move to a dev build. Don't add config plugins that only matter for native builds (e.g. expo-sharing's share-into plugin was deliberately left out of `app.json`).
- React Compiler lint: no reading refs during render (that's why `ScrubBar` uses View responder props, not PanResponder).
- Phones can't reach `localhost` – anything the website hands out with a localhost address (e.g. MinIO links) won't work on a device.
- `app.json` is set up for release (name, slug `show-choir`, scheme `showchoir`, portrait, bundle id `co.uk.show-choir.showchoir` – permanent after the first upload, Android package `co.uk.showchoir.app`). Icon `src/assets/images/icon.png` (1024×1024, must have no transparency for Apple), Android `adaptive-icon.png`, splash is `logo.png` on black.
- Background playback is on (tracks keep playing with the phone locked, lock-screen controls) – only fully testable in a real build, not Expo Go.

## Conventions

- Plain-English comments explaining the *why*, for a non-specialist reviewer.
- Prettier (`.prettierrc`): single quotes, semicolons, trailing commas (es5), tailwind class sorting.
- Styling with NativeWind (`className`); gold theme (`bg-lightGold`, `text-lightGold`, `bg-lightBlack`); icons from `@expo/vector-icons/Ionicons`. Colours needed outside className use `LIGHT_GOLD = 'rgb(222,204,120)'`.
- Messages/confirmations via `src/lib/confirm.ts` (`showMessage`).
- Work on the `dev` branch; commit/push only when asked.
