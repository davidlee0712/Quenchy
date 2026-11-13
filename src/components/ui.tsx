import React from 'react';
import {
  Pressable,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import { type Palette, radius, space, useColors } from '@/constants/theme';

export function Screen({ children, ...rest }: ScrollViewProps & { children: React.ReactNode }) {
  const c = useColors();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      {...rest}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.surface, borderRadius: radius.card, padding: space.lg, gap: space.md }, style]}>{children}</View>;
}

type TProps = TextProps & { style?: TextStyle | TextStyle[] };
export function H2({ style, ...p }: TProps) {
  const c = useColors();
  return <Text style={[{ color: c.ink, fontSize: 17, fontWeight: '700' }, style as TextStyle]} {...p} />;
}
export function Body({ style, ...p }: TProps) {
  const c = useColors();
  return <Text style={[{ color: c.ink, fontSize: 15 }, style as TextStyle]} {...p} />;
}
export function Muted({ style, ...p }: TProps) {
  const c = useColors();
  return <Text style={[{ color: c.muted, fontSize: 13 }, style as TextStyle]} {...p} />;
}
export function Eyebrow({ style, ...p }: TProps) {
  const c = useColors();
  return (
    <Text
      style={[{ color: c.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }, style as TextStyle]}
      {...p}
    />
  );
}
export function Big({ style, ...p }: TProps) {
  const c = useColors();
  return <Text style={[{ color: c.ink, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] }, style as TextStyle]} {...p} />;
}

export function CardHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.rowBetween}>
      <H2>{title}</H2>
      {action ? <LinkButton title={action} onPress={onAction} /> : null}
    </View>
  );
}

export function LinkButton({ title, onPress, color }: { title: string; onPress?: () => void; color?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
      {({ pressed }) => (
        <Text style={{ color: color ?? c.water, fontWeight: '700', fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase', opacity: pressed ? 0.6 : 1 }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  kind = 'solid',
  style,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  kind?: 'solid' | 'outline' | 'danger';
  style?: ViewStyle;
}) {
  const c = useColors();
  const solid = kind === 'solid';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          backgroundColor: solid ? c.water : 'transparent',
          borderWidth: solid ? 0 : 1,
          borderColor: kind === 'danger' ? c.danger : c.line,
          borderRadius: radius.control,
          paddingVertical: 13,
          paddingHorizontal: 18,
          alignItems: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
        style,
      ]}>
      <Text style={{ color: solid ? c.onWater : kind === 'danger' ? c.danger : c.water, fontWeight: '700', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, sub, onPress, dashed }: { label: string; sub?: string; onPress?: () => void; dashed?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
        borderWidth: 1,
        borderStyle: dashed ? 'dashed' : 'solid',
        borderColor: c.line,
        backgroundColor: c.bg,
        borderRadius: radius.pill,
        paddingVertical: 9,
        paddingHorizontal: 13,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text style={{ color: c.ink, fontWeight: '600' }}>{label}</Text>
      {sub ? <Text style={{ color: c.muted, fontSize: 12, fontVariant: ['tabular-nums'] }}>{sub}</Text> : null}
    </Pressable>
  );
}

export function Pill({ text, good }: { text: string; good?: boolean }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: good ? c.good : c.track, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ color: good ? '#fff' : c.muted, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Bar({ pct, height = 8 }: { pct: number; height?: number }) {
  const c = useColors();
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: c.track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct * 100))}%`, height: '100%', backgroundColor: pct >= 1 ? c.good : c.water }} />
    </View>
  );
}

export function Ring({ pct, size = 150, children }: { pct: number; size?: number; children?: React.ReactNode }) {
  const c = useColors();
  const stroke = Math.round(size * 0.08);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={p >= 1 ? c.good : c.water}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          fill="none"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  );
}

export type ChartDay = { key: string; label: string; value: number };

/** Bars per day with a dashed goal line; drawn to one scale. */
export function DayChart({
  days,
  goal,
  height = 170,
  width,
  formatTick,
  onPressDay,
  selected,
}: {
  days: ChartDay[];
  goal: number;
  height?: number;
  width: number;
  formatTick: (v: number) => string;
  onPressDay?: (key: string) => void;
  selected?: string;
}) {
  const c = useColors();
  const padL = 40;
  const padB = 20;
  const padT = 8;
  const max = Math.max(goal * 1.15, ...days.map((d) => d.value), 1);
  const y = (v: number) => padT + (height - padT - padB) * (1 - v / max);
  const bw = (width - padL) / Math.max(1, days.length);
  return (
    <Svg width={width} height={height}>
      {[0, goal / 2, goal].map((v, i) => (
        <React.Fragment key={i}>
          <Line x1={padL} x2={width} y1={y(v)} y2={y(v)} stroke={c.line} strokeWidth={i === 2 ? 1.5 : 1} strokeDasharray={i === 2 ? '4 3' : undefined} />
          <SvgText x={padL - 6} y={y(v) + 4} fontSize={10} fill={c.muted} textAnchor="end">
            {formatTick(v)}
          </SvgText>
        </React.Fragment>
      ))}
      {days.map((d, i) => {
        const x = padL + i * bw + bw * 0.18;
        const w = bw * 0.64;
        const top = y(d.value);
        return (
          <React.Fragment key={d.key}>
            <Rect
              x={x}
              y={top}
              width={w}
              height={Math.max(0, height - padB - top)}
              rx={Math.min(4, w / 3)}
              fill={d.value >= goal && goal > 0 ? c.water : c.water2}
              onPress={onPressDay ? () => onPressDay(d.key) : undefined}
            />
            {selected === d.key ? <Rect x={x - 2} y={height - padB + 2} width={w + 4} height={2} fill={c.ink} /> : null}
            {d.label ? (
              <SvgText x={x + w / 2} y={height - 4} fontSize={10} fill={c.muted} textAnchor="middle">
                {d.label}
              </SvgText>
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const c = useColors();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.water2, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.brand, fontWeight: '800', fontSize: size * 0.38 }}>{initials || '?'}</Text>
    </View>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line }} />;
}

export function inputStyle(c: Palette): TextStyle {
  return {
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: c.surface,
    color: c.ink,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  };
}

export const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
