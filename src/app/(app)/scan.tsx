// GA-only "Scan Members" tab.
//
// Flow: GA confirms the rehearsal venue (VenueBar) -> camera reads a member's
// QR code -> we pull their email out of it -> POST it with the venue to the
// website's check-in endpoint, which records them as here -> show a coloured
// toast with the result (and play a ting if they're allowed in) -> after a few
// seconds, the scanner is ready for the next person.
//
// A "Check myself in" button at the top of the camera lets the GA check
// themselves in too - free, no payment check (GAs often sing for free) - and
// disappears once they're checked in at the selected rehearsal.
//
// "Search by name" (bottom of the camera) is for members without their QR
// code: the GA finds them in the MemberSearch panel and taps Check in, which
// works exactly like scanning their card.
//
// If they're not paid up (no sessions left, owing, or no active Direct
// Debit), the PaymentDrawer slides up instead of a toast. The GA records cash
// or card (iZettle) for a pack of 10, or "pay later", and that choice is sent
// to the website's record-payment endpoint, which checks them in.

import Ionicons from '@expo/vector-icons/Ionicons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  MemberSearch,
  type MemberSearchResult,
} from '@/components/MemberSearch';
import {
  PaymentDrawer,
  type DeskPayment,
  type UnpaidMember,
} from '@/components/PaymentDrawer';
import { ScanResultToast, type ScanToast } from '@/components/ScanResultToast';
import { VenueBar } from '@/components/VenueBar';
import { useAuth } from '@/contexts/authContext';
import { useRehearsal } from '@/contexts/rehearsalContext';

// How long a result stays on screen before the scanner accepts the next code.
const RESULT_DISPLAY_MS = 5000;

// Matches `lightGold` in tailwind.config.js (icon colours aren't set via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

// ---------------------------------------------------------------------------
// Types & helpers (outside the component - they don't need React state)
// ---------------------------------------------------------------------------

// Mirrors CheckInResponse in the website's api/member-resources/check-in-member.ts
//   mandate            - active Direct Debit, let them in (nothing deducted)
//   ga                 - a GA, free - no payment check, nothing deducted
//   flexi              - one flexi session was just deducted
//   already_checked_in - already scanned in at this rehearsal, not charged again
//   no_sessions        - not paid up (no mandate, 0 or fewer flexi sessions) -
//                        opens the PaymentDrawer
//   not_found          - no member with that email
type CheckInResponse = {
  status:
    | 'mandate'
    | 'ga'
    | 'flexi'
    | 'already_checked_in'
    | 'no_sessions'
    | 'not_found';
  first_name?: string;
  last_name?: string;
  membership_type?: string;
  // Negative when they owe sessions after paying later
  flexi_sessions?: number;
  // With no_sessions only: price of their pack of 10 to take at the desk, by
  // card (pack_price) and cash (cash_price, £5 less) - set in the website's
  // env vars: full price card £95 / cash £90, concession £85 / £80
  pack_price?: number;
  cash_price?: number;
  concession?: boolean;
  // With no_sessions only: whether they can pay at the desk (Flexi members
  // only - Flexi is being phased out)
  can_buy_flexi?: boolean;
};

// Mirrors RecordPaymentResponse in the website's api/member-resources/record-payment.ts
//   paid               - cash/card recorded, pack of 10 added, checked in
//   pay_later          - checked in on credit, balance went down by 1
//   already_checked_in - already here at this rehearsal, nothing recorded
//   not_found          - no member with that email
type RecordPaymentResponse = {
  status: 'paid' | 'pay_later' | 'already_checked_in' | 'not_found';
  first_name?: string;
  last_name?: string;
  flexi_sessions?: number;
  // Pounds taken at the desk (paid only)
  amount?: number;
};

// "1 session left" / "6 sessions left" / "owes 2 sessions"
const sessionsLeft = (count = 0) => {
  const plural = Math.abs(count) === 1 ? '' : 's';
  return count < 0
    ? `owes ${-count} session${plural}`
    : `${count} session${plural} left`;
};

// "Jamie Mac" (skips a missing first or last name)
const fullName = (result: { first_name?: string; last_name?: string }) =>
  [result.first_name, result.last_name].filter(Boolean).join(' ');

// Turns the API's answer into what the toast shows:
// green = let them in, amber = already signed in, red = not allowed.
function toToast(result: CheckInResponse): ScanToast {
  const name = fullName(result);

  switch (result.status) {
    case 'mandate':
      return { variant: 'success', title: 'OK', message: name };
    case 'ga':
      return { variant: 'success', title: 'OK · GA', message: name };
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
        // Direct Debit members have no session count
        message:
          result.flexi_sessions === undefined
            ? name
            : `${name} · ${sessionsLeft(result.flexi_sessions)}`,
      };
    // Normally opens the PaymentDrawer instead (see handleScan) - kept as a
    // fallback so every status has a toast.
    case 'no_sessions':
      return { variant: 'error', title: 'No sessions left', message: name };
    default:
      return { variant: 'error', title: 'Member not found' };
  }
}

// Toast after the GA picks an option in the PaymentDrawer:
// green = paid and in, amber = in but owes / already here, red = not found.
function toPaymentToast(
  result: RecordPaymentResponse,
  payment: DeskPayment
): ScanToast {
  const name = fullName(result);

  switch (result.status) {
    case 'paid':
      return {
        variant: 'success',
        // e.g. "Paid £95 by cash · 9 sessions left"
        title: `Paid ${result.amount ? `£${result.amount} ` : ''}by ${payment} · ${sessionsLeft(result.flexi_sessions)}`,
        message: name,
      };
    case 'pay_later':
      return {
        variant: 'warning',
        title: `Pay later · ${sessionsLeft(result.flexi_sessions)}`,
        message: name,
      };
    case 'already_checked_in':
      return {
        variant: 'warning',
        title: 'Already signed in',
        message: `${name} · not charged`,
      };
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

  const { profile, authRequest } = useAuth();
  // The rehearsal we're scanning people into (picked in the VenueBar)
  const { venue, today } = useRehearsal();
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
  // Someone scanned who isn't paid up - shows the PaymentDrawer
  const [unpaid, setUnpaid] = useState<UnpaidMember | null>(null);
  // True while a drawer choice is being sent to the website
  const [isSaving, setIsSaving] = useState(false);

  // --- Setup / cleanup ---

  useEffect(() => {
    // Play the ting even if the phone's silent switch is on.
    setAudioModeAsync({ playsInSilentMode: true });
    // Don't let the timer fire after the screen has gone away.
    return () => clearTimeout(resetTimer.current);
  }, []);

  // --- Talk to the website ---

  // Asks the website to check this member in to the selected rehearsal.
  // Returns the API's answer, or throws if the request fails (network down,
  // server error, etc). authRequest handles an expired login token.
  const checkIn = (email: string, venueSlug: string) =>
    authRequest<CheckInResponse>({
      method: 'POST',
      url: '/api/member-resources/check-in-member',
      data: { email, venue: venueSlug },
    });

  // Sends the GA's choice from the PaymentDrawer: records a desk payment (or
  // pay later) and checks them in. Returns the API's answer, or throws.
  const recordPayment = (
    email: string,
    venueSlug: string,
    payment: DeskPayment
  ) =>
    authRequest<RecordPaymentResponse>({
      method: 'POST',
      url: '/api/member-resources/record-payment',
      data: { email, venue: venueSlug, payment },
    });

  // --- Showing a result ---

  // Shown when the website can't be reached or errors
  const couldNotCheck: ScanToast = {
    variant: 'error',
    title: "Couldn't check member",
    message: 'Please try again',
  };

  // Shows the toast (with a ting if they're allowed in), then clears it and
  // allows the next scan.
  const showResult = (result: ScanToast, allowedIn: boolean) => {
    if (allowedIn) {
      ting.seekTo(0); // rewind, in case it played for the last person
      ting.play();
    }
    setToast(result);
    resetTimer.current = setTimeout(() => {
      setToast(null);
      isBusy.current = false;
    }, RESULT_DISPLAY_MS);
  };

  // --- Is the GA checked in here themselves? ---

  // For the "Check myself in" button: whether the GA using this phone is
  // already checked in at the selected rehearsal (asked from the website, so
  // it's right after reopening the app too). Remembers which venue it's for,
  // so switching venue doesn't show the last venue's answer.
  const [selfStatus, setSelfStatus] = useState<{
    venueSlug: string;
    checkedIn: boolean;
  } | null>(null);

  const loadSelfStatus = useCallback(async () => {
    if (!venue || !today) return;
    try {
      const data = await authRequest<{ me_checked_in: boolean }>({
        url: '/api/member-resources/attendance',
        params: { venue: venue.slug, date: today },
      });
      setSelfStatus({ venueSlug: venue.slug, checkedIn: data.me_checked_in });
    } catch {
      // Can't tell - leave the button as it was
    }
    // authRequest changes identity every render; the venue/date are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue?.slug, today]);

  // Check whenever the Scan tab is opened or the venue changes (e.g. after
  // undoing their own check-in on Who's here, the button comes back).
  useFocusEffect(
    useCallback(() => {
      loadSelfStatus();
    }, [loadSelfStatus])
  );

  const showSelfCheckIn =
    !!venue && selfStatus?.venueSlug === venue.slug && !selfStatus.checkedIn;

  // --- Check someone in ---

  // Checks in the member with this email at the selected rehearsal and shows
  // the result - used for scanned QR codes and the GA's "Check myself in".
  // The caller has already set isBusy.
  const checkInEmail = async (email: string) => {
    if (!venue) return;
    try {
      const response = await checkIn(email, venue.slug);

      // Not paid up - open the drawer and wait for the GA to choose.
      // Scanning stays paused (isBusy) until they do.
      if (response.status === 'no_sessions') {
        setUnpaid({
          email,
          name: fullName(response),
          membership_type: response.membership_type,
          flexi_sessions: response.flexi_sessions ?? 0,
          pack_price: response.pack_price,
          cash_price: response.cash_price,
          concession: response.concession,
          can_buy_flexi: response.can_buy_flexi,
        });
        return;
      }

      showResult(
        toToast(response),
        ['mandate', 'ga', 'flexi'].includes(response.status)
      );
    } catch {
      // Couldn't reach the website, or it errored.
      showResult(couldNotCheck, false);
    }
  };

  // --- Handle a scan ---

  // Called by the camera every time it sees a QR code.
  const handleScan = async ({ data }: { data: string }) => {
    // 1. Ignore scans while we're still dealing with the last one (including
    //    while the payment drawer is open), while the name search is open, or
    //    before the GA has chosen which rehearsal they're at.
    if (isBusy.current || isSearchOpen || !venue) return;
    isBusy.current = true;
    clearTimeout(resetTimer.current);

    // 2. Not one of our membership QR codes.
    const email = parseEmail(data);
    if (!email) {
      showResult(
        { variant: 'error', title: 'Not a Show Choir QR code' },
        false
      );
      return;
    }

    // 3. Check them in.
    await checkInEmail(email);
  };

  // --- "Check myself in" button ---

  // The GA checks themselves in, as if they'd scanned their own card. GAs are
  // free: the website just records them as here (status "ga") - no payment
  // check, no session used. Then the button disappears.
  const handleSelfCheckIn = async () => {
    if (isBusy.current || !venue || !profile?.email) return;
    isBusy.current = true;
    clearTimeout(resetTimer.current);
    await checkInEmail(profile.email);
    loadSelfStatus();
  };

  // --- "Search by name" (no QR code) ---

  // For someone with no phone or printed card: the GA finds them by name in
  // the MemberSearch panel and taps Check in, which is handled exactly like
  // scanning their card - same toast, ting and payment drawer.
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchCheckIn = async (member: MemberSearchResult) => {
    // Not while the payment drawer is open for someone else
    if (unpaid || !venue) return;
    // Replace any result still showing from the last scan
    isBusy.current = true;
    clearTimeout(resetTimer.current);
    setToast(null);
    await checkInEmail(member.email);
    // If the GA found themselves, hide "Check myself in"
    if (member.email === profile?.email) loadSelfStatus();
  };

  // --- Handle the payment drawer ---

  // Cash / card / pay later - all of them check the member in.
  const handlePayment = async (payment: DeskPayment) => {
    if (!unpaid || !venue) return;
    // Shows a spinner and stops the buttons being tapped twice
    setIsSaving(true);
    try {
      const response = await recordPayment(unpaid.email, venue.slug, payment);
      // Ting for paid and pay later - either way they're let in.
      showResult(
        toPaymentToast(response, payment),
        response.status === 'paid' || response.status === 'pay_later'
      );
    } catch {
      // Nothing was recorded - they can be scanned again.
      showResult(couldNotCheck, false);
    } finally {
      // Close the drawer either way; showResult re-enables scanning.
      setIsSaving(false);
      setUnpaid(null);
      // If the GA was paying for themselves, hide "Check myself in"
      if (unpaid.email === profile?.email) loadSelfStatus();
    }
  };

  // "Cancel - don't check in": nothing is recorded, close the drawer and
  // show a red toast so the GA knows they weren't let in.
  const handleCancelPayment = () => {
    const name = unpaid?.name;
    setUnpaid(null);
    showResult(
      { variant: 'error', title: 'Not checked in', message: name },
      false
    );
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

  // Ready to scan: venue bar, then full-screen camera with the result toast /
  // hint on top.
  return (
    <View className="flex-1 bg-lightBlack">
      <VenueBar label="Scanning for" />
      <View className="flex-1">
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
        {/* "Check myself in" - top of the camera, until the GA is checked in
            at this rehearsal (hidden while a result is showing) */}
        {showSelfCheckIn && !toast ? (
          <View className="absolute left-0 right-0 top-4 items-center">
            <Pressable
              onPress={handleSelfCheckIn}
              className="flex-row items-center rounded-full bg-lightGold px-5 py-3 active:opacity-80"
            >
              <Ionicons name="person-add" size={20} color="black" />
              <Text className="ml-2 text-base font-bold text-black">
                Check myself in
              </Text>
            </Pressable>
          </View>
        ) : null}
        {/* Overlay pinned to the bottom of the camera view */}
        <View className="absolute bottom-8 left-4 right-4">
          {/* For members without their QR code (hidden while a result shows) */}
          {venue && !toast ? (
            <Pressable
              onPress={() => setIsSearchOpen(true)}
              className="mb-3 flex-row items-center justify-center self-center rounded-full border-2 border-lightGold bg-black/70 px-5 py-3 active:opacity-80"
            >
              <Ionicons name="search" size={18} color={LIGHT_GOLD} />
              <Text className="ml-2 text-base font-bold text-lightGold">
                Search by name
              </Text>
            </Pressable>
          ) : null}
          {toast ? (
            <ScanResultToast {...toast} />
          ) : (
            <Text className="rounded-lg bg-black/60 px-4 py-3 text-center text-base text-white">
              {venue
                ? 'Point the camera at a member’s QR code'
                : 'Choose the rehearsal venue above to start scanning'}
            </Text>
          )}
        </View>
      </View>

      {/* Slides up when someone isn't paid up. Hidden (but still waiting)
          while the GA is on another tab, as a Modal would cover every tab. */}
      <PaymentDrawer
        member={isFocused ? unpaid : null}
        isSaving={isSaving}
        onChoose={handlePayment}
        onCancel={handleCancelPayment}
      />

      {/* "Search by name" panel - closes itself when a member is picked */}
      <MemberSearch
        visible={isFocused && isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onCheckIn={handleSearchCheckIn}
      />
    </View>
  );
};

export default ScanScreen;
