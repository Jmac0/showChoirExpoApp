import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const SIZE = 160;
const STROKE_WIDTH = 14;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Green while sessions are plentiful, tapering through amber to red as they run out.
function getFillColor(percentRemaining: number) {
  if (percentRemaining > 0.6) return '#22c55e';
  if (percentRemaining > 0.3) return '#f59e0b';
  return '#ef4444';
}

type Props = {
  remaining: number;
  total?: number;
};

export function FlexiSessionsRing({ remaining, total = 10 }: Props) {
  // The DB only tracks a running total, not what was originally granted, so
  // a top-up (e.g. buying 10 more while 5 remain) can push remaining above
  // total. Cap the ring's fill at "full" in that case, but keep showing the
  // real count in the center.
  const safeRemaining = Math.max(0, remaining);
  const percentRemaining =
    total > 0 ? Math.min(safeRemaining, total) / total : 0;
  const fillColor = getFillColor(percentRemaining);

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke="#e5e7eb"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={fillColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - percentRemaining)}
          fill="none"
          transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`}
        />
      </Svg>
      <View
        style={StyleSheet.absoluteFill}
        className="items-center justify-center"
      >
        <Text className="text-3xl font-bold text-white">
          {safeRemaining}
        </Text>
        <Text className="text-xs text-white">sessions left</Text>
      </View>
    </View>
  );
}
