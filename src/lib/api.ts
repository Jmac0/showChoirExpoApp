import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Port the website's `next dev` server runs on.
const DEV_API_PORT = 3000;

// Matches a LAN IP (e.g. 192.168.0.94) or localhost - not a tunnel URL like
// abc-anonymous-8081.exp.direct, which can't reach the website's port.
const LOCAL_HOST = /^(localhost|\d{1,3}(\.\d{1,3}){3})$/;

// In development, find the Mac's current address automatically, so the app
// keeps working when the Mac changes network. The phone already loaded the
// app from the Mac's Expo server, so Expo knows its address (hostUri, e.g.
// "192.168.0.94:8081"); the website runs on the same machine.
function devBaseUrl() {
  if (!__DEV__) return null;

  const host =
    Platform.OS === 'web'
      ? window.location.hostname
      : Constants.expoConfig?.hostUri?.split(':')[0];

  return host && LOCAL_HOST.test(host)
    ? `http://${host}:${DEV_API_PORT}`
    : null;
}

// Website API address. Falls back to EXPO_PUBLIC_BASE_URL for release builds
// (and dev over a tunnel).
export const BASE_URL = devBaseUrl() ?? process.env.EXPO_PUBLIC_BASE_URL;

// Give up on a request after this long, so an unreachable server shows an
// error instead of leaving the app stuck on "Logging in..." forever.
const REQUEST_TIMEOUT_MS = 10000;

// Use this instead of plain axios for calls to the website, e.g.
// api.post('/api/auth/appLogin', { email, password })
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});
