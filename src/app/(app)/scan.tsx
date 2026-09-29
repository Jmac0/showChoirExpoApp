// GA-only "Scan Members" tab.
//
// Flow: camera reads a member's QR code -> we pull their email out of it ->
// POST it to the website's check-in endpoint -> show a coloured toast with the
// result (and play a ting if they're allowed in) -> after a few seconds, the
// scanner is ready for the next person.

import axios from 'axios';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ScanResultToast, type ScanToast } from '@/components/ScanResultToast';
import { useAuth } from '@/contexts/authContext';
import { api } from '@/lib/api';

// How long a result stays on screen before the scanner accepts the next code.
const RESULT_DISPLAY_MS = 5000;

// ---------------------------------------------------------------------------
// Types & helpers (outside the component - they don't need React state)
// ---------------------------------------------------------------------------

// Mirrors CheckInResponse in the website's api/member-resources/check-in-member.ts
//   mandate            - active Direct Debit, let them in (nothing deducted)
//   flexi              - one flexi session was just deducted
//   already_checked_in - flexi member scanned again within the cooldown, not charged
//   no_sessions        - no mandate and 0 flexi sessions
//   not_found          - no member with that email
type CheckInResponse = {
  status:
    'mandate' | 'flexi' | 'already_checked_in' | 'no_sessions' | 'not_found';
  first_name?: string;
  last_name?: string;
  flexi_sessions?: number;
};

// "1 session left" / "6 sessions left"
const sessionsLeft = (count = 0) =>
  `${count} session${count === 1 ? '' : 's'} left`;

// Turns the API's answer into what the toast shows:
// green = let them in, amber = already signed in, red = not allowed.
function toToast(result: CheckInResponse): ScanToast {
  const name = [result.first_name, result.last_name].filter(Boolean).join(' ');

  switch (result.status) {
    case 'mandate':
      return { variant: 'success', title: 'OK', message: name };
    case 'flexi':
      return {
        variant: 'success',
        title: sessionsLeft(result.flexi_sessions),
        message: name,
      };
    case 'already_checked_in':
      return {
        variant: 'warning',
        title: 'Already signed in',
        message: `${name} · ${sessionsLeft(result.flexi_sessions)}`,
      };
    case 'no_sessions':
      return { variant: 'error', title: 'No sessions left', message: name };
    default:
      return { variant: 'error', title: 'Member not found' };
  }
}

// The member's QR code (see index.tsx) is JSON containing their email.
// Returns null for any other QR code (a URL, random text, etc).
function parseEmail(data: string) {
  try {
    const { email } = JSON.parse(data);
    return typeof email === 'string' && email.includes('@') ? email : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const ScanScreen = () => {
  // --- State & hooks ---

  const { session, profile, refreshAccessToken } = useAuth();
  // null while loading, then { granted: true/false }
  const [permission, requestPermission] = useCameraPermissions();
  // false when the GA is on another tab - used to switch the camera off
  const isFocused = useIsFocused();
  // The result currently on screen, or null to show the "point the camera" hint
  const [toast, setToast] = useState<ScanToast | null>(null);
  // True while a scan is being checked / its result is showing, so we ignore
  // new scans. A ref rather than state: the camera fires several scan events
  // for one QR code before a state update would re-render and pause it.
  const isBusy = useRef(false);
  // Timer that hides the toast and re-enables scanning
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Pre-loaded so the ting plays instantly on a successful scan
  const ting = useAudioPlayer(require('@/assets/sounds/ting.wav'));

  // --- Setup / cleanup ---

  useEffect(() => {
    // Play the ting even if the phone's silent switch is on.
    setAudioModeAsync({ playsInSilentMode: true });
    // Don't let the timer fire after the screen has gone away.
    return () => clearTimeout(resetTimer.current);
  }, []);

  // --- Talk to the website ---

  // Asks the website to check this member in. Returns the API's answer, or
  // throws if the request fails (network down, server error, etc).
  const checkIn = async (email: string) => {
    const post = (token: string) =>
      api.post<CheckInResponse>(
        '/api/member-resources/check-in-member',
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

    try {
      return (await post(session!.accessToken)).data;
    } catch (error) {
      // Anything other than "not authorised" is a real failure - pass it on.
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        throw error;
      }
      // Access token expired mid-rehearsal - refresh it and try once more.
      const newToken = await refreshAccessToken();
      if (!newToken) throw error;
      return (await post(newToken)).data;
    }
  };

  // --- Handle a scan ---

  // Called by the camera every time it sees a QR code.
  const handleScan = async ({ data }: { data: string }) => {
    // 1. Ignore scans while we're still dealing with the last one.
    if (isBusy.current) return;
    isBusy.current = true;
    clearTimeout(resetTimer.current);

    // 2. Work out what to show.
    const email = parseEmail(data);
    let result: ScanToast;
    if (!email) {
      // Not one of our membership QR codes.
      result = { variant: 'error', title: 'Not a Show Choir QR code' };
    } else {
      try {
        const response = await checkIn(email);
        result = toToast(response);
        // Ting only when they're allowed in.
        if (response.status === 'mandate' || response.status === 'flexi') {
          ting.seekTo(0); // rewind, in case it played for the last person
          ting.play();
        }
      } catch {
        // Couldn't reach the website, or it errored.
        result = {
          variant: 'error',
          title: "Couldn't check member",
          message: 'Please try again',
        };
      }
    }

    // 3. Show the result, then clear it and allow the next scan.
    setToast(result);
    resetTimer.current = setTimeout(() => {
      setToast(null);
      isBusy.current = false;
    }, RESULT_DISPLAY_MS);
  };

  // --- What to render ---

  // Not a GA. The tab is hidden for them anyway (see (app)/_layout.tsx);
  // this guards against reaching the route some other way.
  if (profile?.role !== 'ga') {
    return (
      <View className="flex-1 items-center bg-lightBlack pt-10">
        <Text className="text-white">Only GAs can scan membership cards.</Text>
      </View>
    );
  }

  // Still finding out whether we have camera permission - blank screen.
  if (!permission) {
    return <View className="flex-1 bg-lightBlack" />;
  }

  // No camera permission yet - ask for it.
  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-lightBlack px-8">
        <Text className="text-center text-lg text-white">
          The camera is needed to scan members&apos; QR codes.
        </Text>
        <Pressable
          onPress={requestPermission}
          className="mt-6 rounded-md bg-lightGold px-6 py-3"
        >
          <Text className="text-lg font-bold">Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  // Ready to scan: full-screen camera with the result toast / hint on top.
  return (
    <View className="flex-1 bg-lightBlack">
      {/* Only mount the camera while this tab is showing, so it's released
          when the GA switches tabs. */}
      {isFocused ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScan}
        />
      ) : null}
      {/* Overlay pinned to the bottom of the camera view */}
      <View className="absolute bottom-8 left-4 right-4">
        {toast ? (
          <ScanResultToast {...toast} />
        ) : (
          <Text className="rounded-lg bg-black/60 px-4 py-3 text-center text-base text-white">
            Point the camera at a member&apos;s QR code
          </Text>
        )}
      </View>
    </View>
  );
};

export default ScanScreen;
