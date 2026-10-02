// Music & Lyrics tab - the songs being learnt, with part tracks to play and
// lyrics / sheet music PDFs to open. Same songs as the website's members
// page: the website sends them with links to the files that work for an
// hour, so they're fetched fresh each time this tab opens.

import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ScrubBar } from '@/components/ScrubBar';
import { useAuth } from '@/contexts/authContext';
import { showMessage } from '@/lib/confirm';

// Matches `lightGold` in tailwind.config.js (icons/spinner aren't styled via className)
const LIGHT_GOLD = 'rgb(222,204,120)';

// --- Types - mirror MemberSong / MemberTrack in the website's lib/musicShared.ts ---

type VoicePart =
  'all' | 'soprano' | 'alto' | 'tenor' | 'bass' | 'solo' | 'other';

type Track = {
  id: string;
  kind: 'audio' | 'lyrics' | 'sheet_music';
  part?: VoicePart;
  label: string;
  url: string;
  download_url: string;
};

type Song = {
  id: string;
  title: string;
  status: 'current' | 'archived';
  tracks: Track[];
};

// Same labels as the website (lib/musicShared.ts VOICE_PARTS)
const PARTS: { value: VoicePart; label: string }[] = [
  { value: 'soprano', label: 'Sopranos' },
  { value: 'alto', label: 'Altos / Mezzos' },
  { value: 'tenor', label: 'Tenors' },
  { value: 'bass', label: 'Basses' },
  { value: 'solo', label: 'Solo' },
  { value: 'other', label: 'Other' },
];
const PART_LABELS: Record<VoicePart, string> = {
  all: 'All voices',
  soprano: 'Sopranos',
  alto: 'Altos / Mezzos',
  tenor: 'Tenors',
  bass: 'Basses',
  solo: 'Solo',
  other: 'Other',
};

// The member's "My part" choice, remembered on the phone
const PART_KEY = 'musicPart';
type PartFilter = 'everything' | VoicePart;

// The tracks to show for the chosen part: that part's audio, plus "All
// voices" audio, plus every lyrics / sheet music PDF
const tracksForPart = (tracks: Track[], part: PartFilter) =>
  part === 'everything'
    ? tracks
    : tracks.filter(
        (t) => t.kind !== 'audio' || t.part === part || t.part === 'all'
      );

const MusicScreen = () => {
  const { authRequest } = useAuth();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [part, setPart] = useState<PartFilter>('everything');
  // Which songs are opened up
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [showArchived, setShowArchived] = useState(false);

  // --- One player for the whole tab - tapping a track loads it into this ---
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // --- Load the songs (fresh links) whenever the tab opens ---

  const loadSongs = useCallback(async () => {
    try {
      const data = await authRequest<{ songs: Song[] }>({
        url: '/api/member-resources/get-app-music',
      });
      setSongs(data.songs);
      setError(false);
    } catch {
      setError(true);
    }
    // authRequest changes identity every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSongs();
      // Stop the music when leaving the tab
      return () => {
        player.pause();
        setPlayingId(null);
      };
    }, [loadSongs, player])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadSongs();
    setIsRefreshing(false);
  };

  // --- Remembered part + audio setup ---

  useEffect(() => {
    // Play even with the silent switch on (like the GA scanner's ting)
    setAudioModeAsync({ playsInSilentMode: true });
    AsyncStorage.getItem(PART_KEY).then((saved) => {
      if (saved) setPart(saved as PartFilter);
    });
  }, []);

  const choosePart = (chosen: PartFilter) => {
    setPart(chosen);
    AsyncStorage.setItem(PART_KEY, chosen);
  };

  // --- Playing ---

  const togglePlay = (track: Track) => {
    if (playingId === track.id) {
      // Same track - pause / carry on
      if (status.playing) player.pause();
      else player.play();
      return;
    }
    player.replace({ uri: track.url });
    player.play();
    setPlayingId(track.id);
  };

  const openPdf = (track: Track) =>
    Linking.openURL(track.url).catch(() =>
      showMessage("Couldn't open the file", 'Please try again.')
    );

  // --- Share / save a PDF ---
  // Downloads the PDF to the phone's cache with a readable name, then opens
  // the phone's share sheet - from there members can "Save to Files", save to
  // Books, AirDrop it, send it in WhatsApp, print it, etc.
  const [sharingId, setSharingId] = useState<string | null>(null);

  const sharePdf = async (song: Song, track: Track) => {
    if (sharingId) return;
    setSharingId(track.id);
    try {
      // e.g. "Memory - Lyrics.pdf" (no characters that upset file names)
      const name = `${song.title} - ${track.label}`
        .replace(/[\\/:*?"<>|]/g, '')
        .trim();
      const file = await File.downloadFileAsync(
        track.url,
        new File(Paths.cache, `${name}.pdf`),
        // Replace an older copy from a previous share
        { idempotent: true }
      );
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: name,
      });
    } catch {
      showMessage(
        "Couldn't share the file",
        'Please pull down to refresh and try again.'
      );
    } finally {
      setSharingId(null);
    }
  };

  // --- What to show ---

  const renderSong = (song: Song) => {
    const isOpen = !!open[song.id];
    const tracks = tracksForPart(song.tracks, part);
    return (
      <View
        key={song.id}
        className="mx-4 mb-4 overflow-hidden rounded-xl border-2 border-lightGold"
      >
        {/* Gold header - tap to open */}
        <Pressable
          onPress={() => setOpen({ ...open, [song.id]: !isOpen })}
          className="flex-row items-center justify-between bg-lightGold px-4 py-3"
        >
          <Text className="text-xl font-bold text-black">{song.title}</Text>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={22}
            color="black"
          />
        </Pressable>

        {isOpen ? (
          <View className="bg-lightBlack px-4 py-2">
            {tracks.length === 0 ? (
              <Text className="py-3 text-gray-400">
                No files for this part yet
              </Text>
            ) : null}
            {tracks.map((track) => {
              const isThis = playingId === track.id;
              const isAudio = track.kind === 'audio';
              return (
                <View key={track.id} className="border-b border-white/10 py-3">
                  <Pressable
                    onPress={() =>
                      isAudio ? togglePlay(track) : openPdf(track)
                    }
                    className="flex-row items-center"
                  >
                    <Ionicons
                      name={
                        isAudio
                          ? isThis && status.playing
                            ? 'pause-circle'
                            : 'play-circle'
                          : 'document-text'
                      }
                      size={36}
                      color={LIGHT_GOLD}
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-lg text-white">{track.label}</Text>
                      <Text className="text-xs text-gray-400">
                        {isAudio
                          ? PART_LABELS[track.part || 'other']
                          : track.kind === 'lyrics'
                            ? 'Lyrics · tap to open, or share / save'
                            : 'Sheet music · tap to open, or share / save'}
                      </Text>
                    </View>
                    {/* PDFs: share / save button on the right */}
                    {!isAudio ? (
                      <Pressable
                        onPress={() => sharePdf(song, track)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Share or save ${track.label}`}
                        className="ml-2 h-10 w-10 items-center justify-center"
                      >
                        {sharingId === track.id ? (
                          <ActivityIndicator color={LIGHT_GOLD} />
                        ) : (
                          <Ionicons
                            name="share-outline"
                            size={26}
                            color={LIGHT_GOLD}
                          />
                        )}
                      </Pressable>
                    ) : null}
                  </Pressable>
                  {/* Progress for the track that's playing - drag or tap it
                      to jump back to the bit you're rehearsing */}
                  {isThis ? (
                    <ScrubBar
                      currentTime={status.currentTime}
                      duration={status.duration}
                      onSeek={(seconds) => player.seekTo(seconds)}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  };

  const current = (songs || []).filter((s) => s.status === 'current');
  const archived = (songs || []).filter((s) => s.status === 'archived');

  return (
    <ScrollView
      className="flex-1 bg-lightBlack"
      contentContainerClassName="pb-10 pt-4"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={LIGHT_GOLD}
          colors={[LIGHT_GOLD]}
        />
      }
    >
      {/* --- My part --- */}
      <Text className="mx-4 mb-2 text-sm text-gray-300">My part</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 pb-4"
      >
        {[{ value: 'everything' as const, label: 'Every part' }, ...PARTS].map(
          (p) => (
            <Pressable
              key={p.value}
              onPress={() => choosePart(p.value)}
              className={`mr-2 rounded-full px-4 py-2 ${
                part === p.value ? 'bg-lightGold' : 'border border-lightGold/60'
              }`}
            >
              <Text
                className={
                  part === p.value ? 'font-bold text-black' : 'text-lightGold'
                }
              >
                {p.label}
              </Text>
            </Pressable>
          )
        )}
      </ScrollView>

      {/* --- Songs --- */}
      {error && !songs ? (
        <Text className="mx-4 text-center text-gray-300">
          Couldn&apos;t load the music - pull down to try again
        </Text>
      ) : null}
      {songs && current.length === 0 ? (
        <Text className="mx-4 text-center text-gray-300">
          No songs yet - check back soon!
        </Text>
      ) : null}
      {current.map(renderSong)}

      {/* --- Archived songs, tucked away --- */}
      {archived.length > 0 ? (
        <>
          <Pressable
            onPress={() => setShowArchived(!showArchived)}
            className="mx-4 mb-4 mt-4 items-center rounded-full border border-lightGold/60 py-2"
          >
            <Text className="text-lightGold">
              {showArchived ? 'Hide' : 'Show'} archived songs ({archived.length}
              )
            </Text>
          </Pressable>
          {showArchived ? archived.map(renderSong) : null}
        </>
      ) : null}
    </ScrollView>
  );
};

export default MusicScreen;
