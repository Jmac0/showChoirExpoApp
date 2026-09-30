import { Alert, Platform } from 'react-native';

// "Are you sure?" popup that works everywhere. React Native's Alert with
// buttons does nothing in a web browser, so on web this uses the browser's
// own OK / Cancel box instead.
//   confirm({
//     title: 'Log out?',
//     message: 'You will need your email and password to log back in.',
//     confirmText: 'Log out',
//     onConfirm: signOut,
//   });
export function confirm({
  title,
  message,
  confirmText,
  onConfirm,
}: {
  title: string;
  message: string;
  // Label for the button that goes ahead (shown in red on iPhone)
  confirmText: string;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    // The browser box has its own OK / Cancel buttons
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}

// Simple message with an OK button, e.g. to say something went wrong.
// (Alert does nothing on web, so this uses the browser's alert box there.)
export function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
