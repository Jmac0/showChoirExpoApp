# Show Choir app

Expo (React Native) app for Show Choir members and welcome assistants (GAs). It has no backend of its own – everything comes from the website's API in the sibling repo `../showchoirwebsite` (`src/pages/api/...`).

## Commands

- `npx expo start -c` – start Metro (clear cache after adding packages). The app runs in **Expo Go** on a phone – there's no dev client, no `ios`/`android` folders and no Xcode on this Mac.
- `npm run lint` – ESLint (includes the React Compiler / react-hooks rules). `npx tsc --noEmit` – typecheck.
- The website must be running (`npm run dev` there) for the app to work locally.
- Release builds: EAS Build / Submit in the cloud (`eas build -p ios`, `eas submit -p ios`) – not set up yet (no `eas.json`).

## How it fits together

- **Routing**: expo-router, `src/app/`. `login.tsx` outside the tabs; tabs in `src/app/(app)/`: `index` (home, membership card, flexi ring), `notifications`, `resources` (Music & Lyrics), and for GAs `scan` (QR check-in) and `here` (who's here).
- **API**: always use `api` / `authRequest` from `src/lib/api.ts` and `src/contexts/authContext.tsx`, not plain axios. In development the website address is worked out from the Mac's IP (Expo's `hostUri`) on port 3000; release builds use `EXPO_PUBLIC_BASE_URL`.
- **Auth**: JWT access token + refresh token from the website (`api/auth/appLogin`, `api/auth/refresh`). Refresh token in `expo-secure-store` (localStorage on web). Role from the profile (`role === 'ga'` shows GA tabs).
- **Rehearsal / venue** for GA check-ins: `src/contexts/rehearsalContext.tsx` (AsyncStorage).
- **Music**: `get-app-music` returns songs with 1-hour signed links (fetched on focus, pull to refresh). One `expo-audio` player per screen, `ScrubBar` for seeking; PDFs open with `Linking` or are shared via `expo-file-system` + `expo-sharing`.
- **Types** mirror the website's (comments say which file) – change both sides together.

## Gotchas

- **Only packages included in Expo Go** unless we move to a dev build. Don't add config plugins that only matter for native builds (e.g. expo-sharing's share-into plugin was deliberately left out of `app.json`).
- React Compiler lint: no reading refs during render (that's why `ScrubBar` uses View responder props, not PanResponder).
- Phones can't reach `localhost` – anything the website hands out with a localhost address (e.g. MinIO links) won't work on a device.
- `app.json` still has starter-template leftovers to fix before release: name `showChoirExpoApp`, scheme `acme`, expo-router origin `https://n`; no icon/splash yet.

## Conventions

- Plain-English comments explaining the *why*, for a non-specialist reviewer.
- Prettier (`.prettierrc`): single quotes, semicolons, trailing commas (es5), tailwind class sorting.
- Styling with NativeWind (`className`); gold theme (`bg-lightGold`, `text-lightGold`, `bg-lightBlack`); icons from `@expo/vector-icons/Ionicons`. Colours needed outside className use `LIGHT_GOLD = 'rgb(222,204,120)'`.
- Messages/confirmations via `src/lib/confirm.ts` (`showMessage`).
- Work on the `dev` branch; commit/push only when asked.
