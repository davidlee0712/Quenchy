import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { TopBar } from '@/components/chrome';
import { Card, CardHeader, DayChart, Eyebrow, Muted, Screen } from '@/components/ui';
import { useColors } from '@/constants/theme';
import { fmt, fmtU, parseDay, prettyDay, shiftDay, shortWeekday, today, totalsByDay } from '@/lib/model';
import { useStore } from '@/lib/store';

export default function Progress() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const s = useStore();
  const [range, setRange] = useState<7 | 30>(7);
  const unit = s.settings.unit;
  const goal = s.profile?.goal_ml ?? 2000;
  const totals = totalsByDay(s.drinks);
  const t = today();

  const days = Array.from({ length: range }, (_, i) => {
    const k = shiftDay(t, i - (range - 1));
    const label = range === 7 ? (i === range - 1 ? 'Today' : shortWeekday(k)) : i % 5 === 4 || i === range - 1 ? String(parseDay(k).getDate()) : '';
    return { key: k, label, value: totals.get(k) ?? 0 };
  });
  const sum = days.reduce((a, d) => a + d.value, 0);
  const met = days.filter((d) => goal > 0 && d.value >= goal).length;
  const best = days.reduce<{ key: string; value: number } | null>((a, d) => (d.value > (a?.value ?? 0) ? d : a), null);
  const since = shiftDay(t, -(range - 1));
  const counts = new Map<string, number>();
  for (const d of s.drinks) if (d.day >= since) counts.set(d.name, (counts.get(d.name) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <Screen>
      <TopBar title="Progress" />
      <Card>
        <CardHeader title="Water per day" />
        <View style={{ flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 1, borderColor: c.line, borderRadius: 8, overflow: 'hidden' }}>
          {([7, 30] as const).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRange(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: range === r }}
              style={{ paddingVertical: 6, paddingHorizontal: 14, backgroundColor: range === r ? c.water : 'transparent' }}>
              <Text style={{ color: range === r ? '#fff' : c.muted, fontWeight: '600' }}>{r} days</Text>
            </Pressable>
          ))}
        </View>
        <DayChart
          days={days}
          goal={goal}
          width={width - 64}
          formatTick={(v) => fmt(v, unit)}
          onPressDay={(k) => {
            s.setSelectedDay(k);
            router.navigate('/diary');
          }}
        />
        <Muted>Dashed line is your daily goal. Tap a bar to open that day in your diary.</Muted>
      </Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Average" value={fmtU(sum / range, unit)} sub="per day" />
        <Stat label="Goal met" value={`${met} / ${range}`} sub="days" />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Best day" value={best ? fmtU(best.value, unit) : '–'} sub={best ? prettyDay(best.key) : 'no drinks yet'} />
        <Stat label="Top drink" value={top ? top[0] : '–'} sub={top ? `logged ${top[1]}×` : 'most logged'} small />
      </View>
    </Screen>
  );
}

function Stat({ label, value, sub, small }: { label: string; value: string; sub: string; small?: boolean }) {
  const c = useColors();
  return (
    <Card style={{ flex: 1, gap: 2 }}>
      <Eyebrow>{label}</Eyebrow>
      <Text style={{ color: c.ink, fontSize: small ? 17 : 24, fontWeight: '800', fontVariant: ['tabular-nums'] }} numberOfLines={2}>
        {value}
      </Text>
      <Muted>{sub}</Muted>
    </Card>
  );
}
