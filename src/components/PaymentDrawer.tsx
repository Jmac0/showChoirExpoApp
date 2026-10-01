import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';

// The three choices in the drawer. Matches the website's record-payment
// endpoint and the "payment" saved on each check-in.
export type DeskPayment = 'cash' | 'card' | 'pay_later';

// Who the drawer is for - from the check-in-member "no_sessions" response
export type UnpaidMember = {
  email: string;
  name: string;
  // "flexi" or "DD" - used to explain why they need to pay
  membership_type?: string;
  // 0, or negative if they already owe sessions
  flexi_sessions: number;
  // What to charge for a pack of 10 - by card (pack_price) and by cash
  // (cash_price, cheaper as we pass on the card fee saving):
  //   full price - card £95, cash £90;  concession - card £85, cash £80
  // Set by the website from its env vars, so prices are changed there.
  pack_price?: number;
  cash_price?: number;
  // Existing concession member (new members can't join as concession)
  concession?: boolean;
};

type Props = {
  // The member to show, or null to hide the drawer
  member: UnpaidMember | null;
  // True while the choice is being sent - shows a spinner, disables buttons
  isSaving: boolean;
  onChoose: (payment: DeskPayment) => void;
  onCancel: () => void;
};

// Why they can't just be let in - shown under their name
//   -2 sessions          -> "Owes 2 sessions"
//   Direct Debit member  -> "Direct Debit is not active"
//   otherwise            -> "No sessions left"
function reason(member: UnpaidMember) {
  if (member.flexi_sessions < 0) {
    const owed = -member.flexi_sessions;
    return `Owes ${owed} session${owed === 1 ? '' : 's'}`;
  }
  if (member.membership_type === 'DD') return 'Direct Debit is not active';
  return 'No sessions left';
}

// Slides up on the Scan tab when someone who isn't paid up is scanned, so the
// GA can take payment at the desk for a pack of 10 sessions (cash, or card on
// iZettle) or let them in to pay later. Every option checks them in.
export function PaymentDrawer({ member, isSaving, onChoose, onCancel }: Props) {
  // "£90" / "£95" - or nothing if an older website didn't send the prices
  const cashPrice = member?.cash_price ? `£${member.cash_price}` : '';
  const cardPrice = member?.pack_price ? `£${member.pack_price}` : '';

  return (
    <Modal
      visible={!!member}
      animationType="slide"
      transparent
      // Android back button - same as Cancel (ignored while saving)
      onRequestClose={isSaving ? undefined : onCancel}
    >
      <View className="flex-1 justify-end bg-black/60">
        {member ? (
          <View className="rounded-t-2xl bg-lightBlack px-6 pb-10 pt-6">
            {/* --- Who and why --- */}
            <Text className="text-center text-2xl font-bold text-white">
              {member.name}
            </Text>
            <Text className="mt-1 text-center text-lg font-bold text-amber-400">
              {reason(member)}
            </Text>

            {/* --- Take payment for a pack --- */}
            <Text className="mt-6 text-center text-base text-gray-300">
              Take payment for 10 sessions:
            </Text>
            <Text className="mb-3 text-center text-xs text-gray-400">
              {member.concession ? 'Concession price · ' : ''}Cash is cheaper -
              we pass on the card fee
            </Text>
            {/* Each button shows its own price, big so it's easy to read at
                the desk */}
            <View className="flex-row gap-3">
              <Pressable
                disabled={isSaving}
                onPress={() => onChoose('cash')}
                className="flex-1 items-center rounded-lg bg-lightGold py-4 active:opacity-80"
              >
                <Text className="text-lg font-bold text-black">Cash</Text>
                {cashPrice ? (
                  <Text className="text-3xl font-bold text-black">
                    {cashPrice}
                  </Text>
                ) : null}
              </Pressable>
              <Pressable
                disabled={isSaving}
                onPress={() => onChoose('card')}
                className="flex-1 items-center rounded-lg bg-lightGold py-4 active:opacity-80"
              >
                <Text className="text-lg font-bold text-black">
                  Card · iZettle
                </Text>
                {cardPrice ? (
                  <Text className="text-3xl font-bold text-black">
                    {cardPrice}
                  </Text>
                ) : null}
              </Pressable>
            </View>

            {/* --- Let them in without paying --- */}
            <Pressable
              disabled={isSaving}
              onPress={() => onChoose('pay_later')}
              className="mt-3 items-center rounded-lg border-2 border-amber-400 py-4 active:opacity-80"
            >
              <Text className="text-lg font-bold text-amber-400">
                Pay later
              </Text>
              {/* Preview of the new balance: 0 -> -1, -1 -> -2, ... */}
              <Text className="text-xs text-gray-300">
                Let them in - their balance goes to{' '}
                {Math.min(member.flexi_sessions, 0) - 1}
              </Text>
            </Pressable>

            {/* --- Don't check them in --- */}
            {isSaving ? (
              <ActivityIndicator className="mt-6" color="#fff" />
            ) : (
              <Pressable onPress={onCancel} hitSlop={8} className="mt-6">
                <Text className="text-center text-base text-gray-400 underline">
                  Cancel - don&apos;t check in
                </Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
