import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { FloatingAdd, TopBar } from '@/components/chrome';
import { Eyebrow, LinkButton, Muted, Screen, styles } from '@/components/ui';
import { radius, useColors } from '@/constants/theme';
import { fmt, fmtU, MEALS, timeOf } from '@/lib/model';
import { useStore } from '@/lib/store';

export default function Diary() {
  const c = useColors();
  const s = useStore();
  const unit = s.settings.unit;
  const goal = s.profile?.goal_ml ?? 2000;
  const dayDrinks = s.drinks.filter((d) => d.day === s.selectedDay);
  const total = dayDrinks.reduce((a, d) => a + d.ml, 0);
  const rem = goal - total;

  function confirmRemove(id: string, name: string) {
    Alert.alert('Remove drink?', name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => s.removeDrink(id).catch((e) => Alert.alert("Couldn't remove it", e instanceof Error ? e.message : 'Try again.')),
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}>
        <TopBar dayNav />

        <View style={{ backgroundColor: c.surface, borderRadius: radius.card, padding: 16, gap: 8 }}>
          <Eyebrow>Water remaining</Eyebrow>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Eq value={fmt(goal, unit)} label="Goal" />
            <Op>−</Op>
            <Eq value={fmt(total, unit)} label="Drank" />
            <Op>=</Op>
            <Eq value={fmt(Math.abs(rem), unit)} label={rem >= 0 ? 'Remaining' : 'Over goal'} color={rem <= 0 ? c.good : c.water} />
          </View>
        </View>

        {MEALS.map((m) => {
          const items = dayDrinks.filter((d) => d.meal === m.key).sort((a, b) => a.ts.localeCompare(b.ts));
          const sub = items.reduce((a, d) => a + d.ml, 0);
          return (
            <View key={m.key} style={{ backgroundColor: c.surface, borderRadius: radius.card, overflow: 'hidden' }}>
              <View style={[styles.rowBetween, { padding: 14, borderBottomWidth: 1, borderBottomColor: c.line }]}>
                <View>
                  <Text style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{m.name}</Text>
                  <Muted>{m.hint}</Muted>
                </View>
                <Text style={{ color: c.ink, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{sub ? fmtU(sub, unit) : ''}</Text>
              </View>
              {items.map((d) => (
                <Pressable
                  key={d.id}
                  onLongPress={() => confirmRemove(d.id, d.name)}
                  style={[styles.rowBetween, { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: c.line }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.ink, fontWeight: '500' }} numberOfLines={1}>
                      {d.name}
                    </Text>
                    <Muted>{timeOf(d.ts)}</Muted>
                  </View>
                  <Text style={{ color: c.ink, fontVariant: ['tabular-nums'] }}>{fmtU(d.ml, unit)}</Text>
                  <Pressable onPress={() => confirmRemove(d.id, d.name)} hitSlop={10} accessibilityLabel={`Remove ${d.name}`} style={{ paddingLeft: 12 }}>
                    <Text style={{ color: c.muted, fontSize: 20 }}>×</Text>
                  </Pressable>
                </Pressable>
              ))}
              <View style={{ padding: 12, paddingHorizontal: 14 }}>
                <LinkButton title="Add drink" onPress={() => router.push({ pathname: '/add', params: { meal: m.key } })} />
              </View>
            </View>
          );
        })}
      </Screen>
      <FloatingAdd />
    </View>
  );
}

function Eq({ value, label, color }: { value: string; label: string; color?: string }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color: color ?? c.ink, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Text>
      <Muted style={{ fontSize: 11 }}>{label}</Muted>
    </View>
  );
}

function Op({ children }: { children: string }) {
  const c = useColors();
  return <Text style={{ color: c.muted, fontSize: 18, paddingTop: 1 }}>{children}</Text>;
}
