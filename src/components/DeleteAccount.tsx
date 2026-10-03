import Ionicons from '@expo/vector-icons/Ionicons';
import { isAxiosError } from 'axios';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/contexts/authContext';
import { confirm, showMessage } from '@/lib/confirm';

// "Danger zone" at the bottom of the Account tab: permanently delete their
// account (the website's api/members/delete-account - details, check-ins,
// Mailchimp). Apple requires apps with accounts to offer this. Starts as a
// single button; opens to ask for their password, then "are you sure?".
export function DeleteAccount() {
  const { profile, authRequest, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Deleting the account doesn't stop a Direct Debit - warn them
  const hasActiveDirectDebit =
    profile?.membership_type === 'DD' &&
    profile.active_mandate &&
    !profile.direct_debit;

  const deleteAccount = async () => {
    setIsDeleting(true);
    try {
      await authRequest({
        url: '/api/members/delete-account',
        method: 'POST',
        data: { currentPassword: password },
      });
      showMessage('Account deleted', 'Your account has been deleted.');
      signOut();
    } catch (error) {
      showMessage(
        "Couldn't delete your account",
        (isAxiosError(error) && error.response?.data?.message) ||
          'Please try again.'
      );
      setIsDeleting(false);
    }
  };

  const askFirst = () => {
    if (!password) {
      showMessage('Password needed', 'Please enter your password.');
      return;
    }
    confirm({
      title: 'Permanently delete your account?',
      message:
        "Your details, membership and check-in history will be deleted. This can't be undone.",
      confirmText: 'Delete',
      onConfirm: deleteAccount,
    });
  };

  return (
    <View className="mt-24 w-11/12 items-center rounded-xl border-2 border-red-500 bg-red-100 p-5">
      <Text className="mb-3 text-lg font-bold uppercase tracking-widest text-red-700">
        Danger zone
      </Text>

      {!isOpen ? (
        <Pressable
          onPress={() => setIsOpen(true)}
          className="flex-row items-center"
        >
          <Ionicons name="trash-outline" size={24} color="#b91c1c" />
          <Text className="ml-2 text-xl font-bold text-red-700">
            Delete my account
          </Text>
        </Pressable>
      ) : (
        <View className="w-full">
          <Text className="mb-3 text-base text-gray-800">
            This permanently deletes your account: your details, membership and
            check-in history. It can&apos;t be undone.
          </Text>
          {hasActiveDirectDebit ? (
            <Text className="mb-3 rounded-md border border-amber-500 bg-amber-50 p-3 text-base text-amber-900">
              Deleting your account doesn&apos;t stop your Direct Debit - please
              cancel it with your bank as well, or you&apos;ll keep being
              charged.
            </Text>
          ) : null}
          <Text className="mb-1 text-base text-gray-800">Your password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            className="rounded-md border-2 border-red-500/60 bg-white px-3 py-2 text-base text-black"
          />
          <Pressable
            onPress={askFirst}
            disabled={isDeleting}
            className="mt-4 items-center rounded-md bg-red-600 py-3"
          >
            <Text className="text-lg font-bold text-white">
              {isDeleting ? 'Deleting...' : 'Permanently delete my account'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setPassword('');
              setIsOpen(false);
            }}
            className="mt-4"
          >
            <Text className="text-center text-base text-gray-700 underline">
              Cancel
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
