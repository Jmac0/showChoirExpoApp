import Ionicons from '@expo/vector-icons/Ionicons';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/contexts/authContext';
import { showMessage } from '@/lib/confirm';

// Matches `lightGold` in tailwind.config.js (icons aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';
// Same rule as the website (checked again there)
const MIN_PASSWORD_LENGTH = 5;

const INPUT =
  'rounded-md border-2 border-lightGold/60 bg-white px-3 py-2 text-base text-black';

// "Change password" on the Account tab - same as the website's Account page
// (api/members/change-password). Other phones logged in to the app are
// logged out, in case someone else knew the old password - this one stays
// logged in (it sends its own refresh token to keep). Starts as a button.
export function ChangePassword() {
  const { authRequest, session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmNext, setConfirmNext] = useState('');
  // Show what's typed (the eye button)
  const [isVisible, setIsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const close = () => {
    setCurrent('');
    setNext('');
    setConfirmNext('');
    setIsVisible(false);
    setIsOpen(false);
  };

  const save = async () => {
    // Same checks as the website's form
    let problem = '';
    if (!current) problem = 'Please enter your current password.';
    else if (next.length < MIN_PASSWORD_LENGTH)
      problem = `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
    else if (next !== confirmNext) problem = "The new passwords don't match.";
    if (problem) {
      showMessage('Nearly there', problem);
      return;
    }

    setIsSaving(true);
    try {
      await authRequest({
        url: '/api/members/change-password',
        method: 'POST',
        data: {
          currentPassword: current,
          newPassword: next,
          keepRefreshToken: session?.refreshToken,
        },
      });
      showMessage(
        'Password changed',
        'Use your new password next time you log in. Any other phones have been logged out.'
      );
      close();
    } catch (error) {
      showMessage(
        "Couldn't change your password",
        (isAxiosError(error) && error.response?.data?.message) ||
          'Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <Pressable
        onPress={() => setIsOpen(true)}
        className="mt-6 w-11/12 flex-row items-center justify-center rounded-xl border-2 border-lightGold p-4"
      >
        <Ionicons name="key-outline" size={22} color={LIGHT_GOLD} />
        <Text className="ml-3 text-lg text-lightGold">Change password</Text>
      </Pressable>
    );
  }

  const field = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    autoComplete: 'current-password' | 'new-password'
  ) => (
    <>
      <Text className="mb-1 mt-3 text-sm text-gray-300">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        secureTextEntry={!isVisible}
        autoCapitalize="none"
        autoComplete={autoComplete}
        className={INPUT}
      />
    </>
  );

  return (
    <View className="mt-6 w-11/12 rounded-xl border-2 border-lightGold p-5">
      <View className="mb-1 flex-row items-center justify-center">
        <Ionicons name="key-outline" size={22} color={LIGHT_GOLD} />
        <Text className="ml-3 text-lg font-bold text-lightGold">
          Change password
        </Text>
      </View>

      {field('Current password', current, setCurrent, 'current-password')}
      {field('New password', next, setNext, 'new-password')}
      {field(
        'Confirm new password',
        confirmNext,
        setConfirmNext,
        'new-password'
      )}

      <Pressable
        onPress={() => setIsVisible(!isVisible)}
        className="mt-3 flex-row items-center self-end"
        hitSlop={8}
      >
        <Ionicons
          name={isVisible ? 'eye-off-outline' : 'eye-outline'}
          size={18}
          color="#9ca3af"
        />
        <Text className="ml-1 text-sm text-gray-400">
          {isVisible ? 'Hide passwords' : 'Show passwords'}
        </Text>
      </Pressable>

      <Pressable
        onPress={save}
        disabled={isSaving}
        className="mt-4 items-center rounded-md bg-lightGold py-3"
      >
        <Text className="font-bold text-black">
          {isSaving ? 'Saving...' : 'Save'}
        </Text>
      </Pressable>
      <Pressable onPress={close} className="mt-4">
        <Text className="text-center text-gray-400 underline">Cancel</Text>
      </Pressable>
    </View>
  );
}
