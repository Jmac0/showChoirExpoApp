import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';

import { useRehearsal, type Venue } from '@/contexts/rehearsalContext';

// "2026-09-29" -> "Tue 29 Sep" (noon, so no timezone can shift the day)
export const formatSessionDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

// "Show Choir Banstead" -> "Banstead"
export const venueName = (venue: Venue) =>
  venue.location.replace(/^Show Choir\s+/i, '');

// Bar at the top of the GA's Scan and Who's here tabs showing which
// rehearsal they're working, with a "Change" button to pick another venue.
export function VenueBar({ label }: { label: string }) {
  const { venues, venue, today, setVenue, isLoading, error, reload } =
    useRehearsal();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Today's choirs first, then the rest, keeping Contentful's order.
  const sortedVenues = [
    ...venues.filter((v) => v.rehearsesToday),
    ...venues.filter((v) => !v.rehearsesToday),
  ];

  const choose = (slug: string) => {
    setVenue(slug);
    setIsPickerOpen(false);
  };

  // --- The bar ---

  let barText: string;
  if (isLoading) barText = 'Loading venues…';
  else if (error) barText = "Couldn't load venues";
  else if (venue)
    barText = `${label} ${venueName(venue)}${today ? ` · ${formatSessionDate(today)}` : ''}`;
  else barText = 'Choose the rehearsal venue';

  return (
    <>
      <View className="flex-row items-center justify-between bg-black px-4 py-3">
        <Text
          className={`flex-1 text-base font-bold ${venue ? 'text-lightGold' : 'text-white'}`}
          numberOfLines={1}
        >
          {barText}
        </Text>
        {!isLoading ? (
          <Pressable
            onPress={error ? reload : () => setIsPickerOpen(true)}
            hitSlop={8}
            className="ml-3 rounded-md bg-lightGold px-3 py-1.5"
          >
            <Text className="font-bold">
              {error ? 'Retry' : venue ? 'Change' : 'Choose'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* --- The venue picker --- */}
      <Modal
        visible={isPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPickerOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[80%] rounded-t-2xl bg-lightBlack pb-8">
            <View className="flex-row items-center justify-between p-4">
              <Text className="text-xl font-bold text-lightGold">
                Which rehearsal?
              </Text>
              <Pressable onPress={() => setIsPickerOpen(false)} hitSlop={8}>
                <Text className="text-lg font-bold text-white">✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={sortedVenues}
              keyExtractor={(item) => item.slug}
              renderItem={({ item }) => {
                const isSelected = item.slug === venue?.slug;
                return (
                  <Pressable
                    onPress={() => choose(item.slug)}
                    className={`mx-4 mb-2 rounded-lg p-4 ${isSelected ? 'bg-lightGold' : 'bg-white/10'}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={`text-lg font-bold ${isSelected ? 'text-black' : 'text-white'}`}
                      >
                        {venueName(item)}
                      </Text>
                      {item.rehearsesToday ? (
                        <Text className="rounded bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                          TODAY
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      className={isSelected ? 'text-black' : 'text-gray-300'}
                    >
                      {item.choirDayOfWeek} · {item.time}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
