import { useRef, useState } from 'react';
import { GestureResponderEvent, Text, View } from 'react-native';

type Props = {
  // Where the track is now, and how long it is (seconds)
  currentTime: number;
  duration: number;
  // Jump to this many seconds in
  onSeek: (seconds: number) => void;
};

// "1:05"
const time = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Progress bar for the playing track that members can drag (or tap) to jump
// back to the bit they need to rehearse. Uses React Native's built-in touch
// handling (the View "responder" props) - no extra library, no app rebuild.
// While dragging, the bar and time follow the finger; the track only jumps
// when they let go (so it doesn't stutter through every point on the way).
export function ScrubBar({ currentTime, duration, onSeek }: Props) {
  // The bar, and its left edge on screen + width (measured when touched)
  const bar = useRef<View>(null);
  const barBox = useRef({ x: 0, width: 1 });
  // Where the finger is (0-1) while dragging, or null when not dragging
  const [dragFraction, setDragFraction] = useState<number | null>(null);

  const fractionAt = (event: GestureResponderEvent) =>
    Math.min(
      1,
      Math.max(
        0,
        (event.nativeEvent.pageX - barBox.current.x) / barBox.current.width
      )
    );

  // --- Touch handling ---

  const onTouchStart = (event: GestureResponderEvent) => {
    const { pageX } = event.nativeEvent;
    // Measure now - the page may have scrolled since it was laid out
    bar.current?.measureInWindow((x, _y, width) => {
      barBox.current = { x, width: width || 1 };
      setDragFraction(Math.min(1, Math.max(0, (pageX - x) / (width || 1))));
    });
  };

  const onTouchEnd = (event: GestureResponderEvent) => {
    if (duration) onSeek(fractionAt(event) * duration);
    setDragFraction(null);
  };

  // --- What to show ---

  const fraction =
    dragFraction ?? (duration ? Math.min(1, currentTime / duration) : 0);
  const shownTime =
    dragFraction !== null ? dragFraction * duration : currentTime;

  return (
    <View className="mt-2 flex-row items-center">
      <Text className="w-10 text-xs text-gray-300">{time(shownTime)}</Text>
      {/* Tall touch area around a thin bar, so it's easy to grab */}
      <View
        ref={bar}
        className="mx-2 h-8 flex-1 justify-center"
        accessibilityRole="adjustable"
        accessibilityLabel="Track position"
        accessibilityValue={{ text: `${time(shownTime)} of ${time(duration)}` }}
        // Take the touch straight away, and don't let the page's scrolling
        // steal it while dragging
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={onTouchStart}
        onResponderMove={(event) => setDragFraction(fractionAt(event))}
        onResponderRelease={onTouchEnd}
        onResponderTerminate={() => setDragFraction(null)}
      >
        <View className="h-1 overflow-hidden rounded bg-white/20">
          <View
            className="h-full bg-lightGold"
            style={{ width: `${fraction * 100}%` }}
          />
        </View>
        {/* The dot to drag - bigger while dragging */}
        <View
          pointerEvents="none"
          className={`absolute rounded-full bg-lightGold ${
            dragFraction !== null ? 'h-5 w-5' : 'h-3.5 w-3.5'
          }`}
          style={{
            left: `${fraction * 100}%`,
            marginLeft: dragFraction !== null ? -10 : -7,
          }}
        />
      </View>
      <Text className="w-10 text-right text-xs text-gray-300">
        {time(duration)}
      </Text>
    </View>
  );
}
