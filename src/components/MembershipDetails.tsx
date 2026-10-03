import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { ComponentProps } from 'react';
import { Text, View } from 'react-native';

import type { MemberProfile } from '@/contexts/authContext';

// Matches `lightGold` in tailwind.config.js (icons aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';
const GREEN = '#4ade80'; // tailwind green-400
const AMBER = '#fbbf24'; // tailwind amber-400

type IconName = ComponentProps<typeof FontAwesome5>['name'];

// "flexi" -> "Flexi", "DD" -> "Direct Debit" (as stored on the member) -
// same as the website's Account page
const membershipLabel = (type = '') =>
  ({ flexi: 'Flexi', DD: 'Direct Debit', flexi_expired: 'Flexi (expired)' })[
    type
  ] || type;

// "17 October"
const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

// One line: round gold-bordered icon, small grey label, the value
function DetailRow({
  icon,
  label,
  value,
  iconColor = LIGHT_GOLD,
}: {
  icon: IconName;
  label: string;
  value: string;
  iconColor?: string;
}) {
  return (
    <View className="mt-3 flex-row items-center">
      <View className="h-10 w-10 items-center justify-center rounded-full border border-lightGold/50">
        <FontAwesome5 name={icon} size={16} color={iconColor} solid />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-xs uppercase tracking-wider text-gray-400">
          {label}
        </Text>
        <Text className="text-base text-white">{value}</Text>
      </View>
    </View>
  );
}

// "Your membership" card on the Account tab - the
// same details, icons and look as the website's Account page
// (MemberAccountInfo.tsx): membership type, Direct Debit status (Direct
// Debit members only) and email.
export function MembershipDetails({ profile }: { profile: MemberProfile }) {
  const isDirectDebit = profile.membership_type === 'DD';
  const ended = profile.direct_debit;
  // Same wording as the website: green "Active"; amber "Active until ..."
  // in the 14-day grace period after it stopped; amber "Not active"
  const isFullyActive = profile.active_mandate && !ended;
  let status = profile.active_mandate ? 'Active' : 'Not active';
  if (ended?.in_grace_period) {
    status = `Active until ${dayMonth(ended.grace_ends_at)}`;
  }

  return (
    <View className="mt-4 w-11/12 rounded-xl border-2 border-lightGold bg-lightBlack p-5">
      <View className="mb-1 flex-row items-center justify-center">
        <FontAwesome5 name="id-card" size={18} color={LIGHT_GOLD} solid />
        <Text className="ml-3 text-lg font-bold text-lightGold">
          Your membership
        </Text>
      </View>

      <DetailRow
        icon="theater-masks"
        label="Membership"
        value={membershipLabel(profile.membership_type)}
      />
      {isDirectDebit ? (
        <DetailRow
          icon={isFullyActive ? 'check-circle' : 'exclamation-circle'}
          iconColor={isFullyActive ? GREEN : AMBER}
          label="Status"
          value={status}
        />
      ) : null}
      <DetailRow icon="envelope" label="Email" value={profile.email} />
    </View>
  );
}
