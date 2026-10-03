import Ionicons from '@expo/vector-icons/Ionicons';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/contexts/authContext';
import { showMessage } from '@/lib/confirm';

// Matches `lightGold` in tailwind.config.js (icons aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

const INPUT =
  'rounded-md border-2 border-lightGold/60 bg-white px-3 py-2 text-base text-black';

// "Change email" on the Account tab - same as the website's Account page.
// Sends to the website's api/members/change-email, which emails a link to
// the NEW address: nothing changes until they click it (on the website),
// which also updates GoCardless and Mailchimp. The app stays logged in, and
// shows the new email after a pull to refresh. Starts as a single button.
export function ChangeEmail() {
  const { authRequest } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSending, setIsSending] = useState(false);
  // What the website said, after sending
  const [sentMessage, setSentMessage] = useState('');

  const close = () => {
    setNewEmail('');
    setPassword('');
    setSentMessage('');
    setIsOpen(false);
  };

  const send = async () => {
    if (!newEmail.trim() || !password) {
      showMessage('Nearly there', 'Please enter your new email and password.');
      return;
    }
    setIsSending(true);
    try {
      const { message } = await authRequest<{ message: string }>({
        url: '/api/members/change-email',
        method: 'POST',
        data: { newEmail: newEmail.trim(), currentPassword: password },
      });
      setPassword('');
      setSentMessage(message);
    } catch (error) {
      showMessage(
        "Couldn't change your email",
        (isAxiosError(error) && error.response?.data?.message) ||
          'Please try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) {
    return (
      <Pressable
        onPress={() => setIsOpen(true)}
        className="mt-6 w-11/12 flex-row items-center justify-center rounded-xl border-2 border-lightGold p-4"
      >
        <Ionicons name="mail-outline" size={22} color={LIGHT_GOLD} />
        <Text className="ml-3 text-lg text-lightGold">Change email</Text>
      </Pressable>
    );
  }

  return (
    <View className="mt-6 w-11/12 rounded-xl border-2 border-lightGold p-5">
      <View className="mb-3 flex-row items-center justify-center">
        <Ionicons name="mail-outline" size={22} color={LIGHT_GOLD} />
        <Text className="ml-3 text-lg font-bold text-lightGold">
          Change email
        </Text>
      </View>

      {sentMessage ? (
        // Sent - what to do next
        <Text className="text-base text-gray-200">{sentMessage}</Text>
      ) : (
        <>
          <Text className="mb-1 text-sm text-gray-300">New email</Text>
          <TextInput
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            className={INPUT}
          />
          <Text className="mb-1 mt-3 text-sm text-gray-300">Your password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            className={INPUT}
          />
          <Text className="mt-3 text-center text-xs text-gray-400">
            We&apos;ll email a link to your new address - your email changes
            when you click it (and for your Direct Debit too).
          </Text>
          <Pressable
            onPress={send}
            disabled={isSending}
            className="mt-4 items-center rounded-md bg-lightGold py-3"
          >
            <Text className="font-bold text-black">
              {isSending ? 'Sending...' : 'Send link'}
            </Text>
          </Pressable>
        </>
      )}

      <Pressable onPress={close} className="mt-4">
        <Text className="text-center text-gray-400 underline">
          {sentMessage ? 'Done' : 'Cancel'}
        </Text>
      </Pressable>
    </View>
  );
}
