import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { Card, H2, Muted, PrimaryButton, inputStyle, styles } from '@/components/ui';
import { radius, useColors } from '@/constants/theme';
import { catalog, fmtU, frequentDrinks, fromUnit, type Meal, MEALS, mealNow, prettyDay, today, toUnit, uid } from '@/lib/model';
import { useStore } from '@/lib/store';

type ListTab = 'all' | 'recent' | 'frequent' | 'mine';
type Picked = { name: string; ml: number | null; custom: boolean };

export default function AddDrink() {
  const c = useColors();
  const s = useStore();
  const params = useLocalSearchParams<{ meal?: string; custom?: string }>();
  const unit = s.settings.unit;
  const isToday = s.selectedDay === today();
  const [meal, setMeal] = useState<Meal>(
    MEALS.some((m) => m.key === params.meal) ? (params.meal as Meal) : isToday ? mealNow() : 'afternoon'
  );
  const [tab, setTab] = useState<ListTab>('all');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Picked | null>(params.custom ? { name: '', ml: null, custom: true } : null);

  const items = useMemo(() => {
    const freq = frequentDrinks(s.drinks);
    const q = query.trim().toLowerCase();
    if (q) {
      const pool = new Map<string, { name: string; ml: number; sub: string }>();
      for (const x of catalog(s.settings)) pool.set(x.name + '|' + x.ml, { name: x.name, ml: x.ml, sub: x.category });
      for (const f of freq) pool.set(f.name + '|' + f.ml, { name: f.name, ml: f.ml, sub: `logged ${f.count}×` });
      return [...pool.values()].filter((x) => x.name.toLowerCase().includes(q));
    }
    if (tab === 'recent') return [...freq].sort((a, b) => b.last - a.last).slice(0, 25).map((f) => ({ name: f.name, ml: f.ml, sub: `logged ${f.count}×` }));
    if (tab === 'frequent') return freq.slice(0, 25).map((f) => ({ name: f.name, ml: f.ml, sub: `logged ${f.count}×` }));
    const all = catalog(s.settings).map((x) => ({ name: x.name, ml: x.ml, sub: x.category, mine: x.mine }));
    return tab === 'mine' ? all.filter((x) => x.mine) : all;
  }, [s.drinks, s.settings, tab, query]);

  async function add(name: string, ml: number) {
    try {
      await s.addDrink({ name, ml, meal });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save that drink", e instanceof Error ? e.message : 'Try again.');
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 6 }}>
        <Muted>{isToday ? 'Adding to today' : `Adding to ${prettyDay(s.selectedDay)}`}</Muted>
        <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderRadius: radius.control, padding: 3 }}>
          {MEALS.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => setMeal(m.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: meal === m.key }}
              style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: meal === m.key ? c.water : 'transparent' }}>
              <Text style={{ color: meal === m.key ? '#fff' : c.ink, fontWeight: '600' }}>{m.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {picked ? (
        <Quantity picked={picked} onBack={() => setPicked(null)} onAdd={add} />
      ) : (
        <>
          <TextInput
            style={inputStyle(c)}
            placeholder="Search drinks"
            placeholderTextColor={c.muted}
            value={query}
            onChangeText={setQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {!query ? (
            <View style={{ flexDirection: 'row', gap: 18, borderBottomWidth: 1, borderBottomColor: c.line }}>
              {(['all', 'recent', 'frequent', 'mine'] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setTab(k)}
                  style={{ paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: tab === k ? c.water : 'transparent', marginBottom: -1 }}>
                  <Text style={{ color: tab === k ? c.ink : c.muted, fontWeight: '600' }}>
                    {k === 'all' ? 'All' : k === 'recent' ? 'Recent' : k === 'frequent' ? 'Frequent' : 'My drinks'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={{ backgroundColor: c.surface, borderRadius: radius.card, overflow: 'hidden' }}>
            {items.length === 0 ? (
              <Muted style={{ padding: 16 }}>
                {query
                  ? `No drinks match “${query.trim()}”. Create a custom drink below.`
                  : tab === 'mine'
                    ? 'No saved drinks yet. Create a custom drink and tick “Save to My drinks”.'
                    : 'Drinks you log will appear here.'}
              </Muted>
            ) : (
              items.map((x, i) => (
                <View key={x.name + x.ml + i} style={[styles.row, { borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: c.line }]}>
                  <Pressable onPress={() => setPicked({ name: x.name, ml: x.ml, custom: false })} style={{ flex: 1, paddingVertical: 12, paddingLeft: 16 }}>
                    <Text style={{ color: c.ink, fontWeight: '600' }}>{x.name}</Text>
                    <Muted>
                      {fmtU(x.ml, unit)} · {x.sub}
                    </Muted>
                  </Pressable>
                  <Pressable onPress={() => add(x.name, x.ml)} hitSlop={6} accessibilityLabel={`Add ${x.name}`} style={{ paddingHorizontal: 18, paddingVertical: 12 }}>
                    <Text style={{ color: c.water, fontSize: 26, fontWeight: '500' }}>+</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
          <PrimaryButton title="+ Create a custom drink" onPress={() => setPicked({ name: '', ml: null, custom: true })} />
        </>
      )}
    </ScrollView>
  );
}

function Quantity({ picked, onBack, onAdd }: { picked: Picked; onBack: () => void; onAdd: (name: string, ml: number) => void }) {
  const c = useColors();
  const s = useStore();
  const unit = s.settings.unit;
  const [name, setName] = useState(picked.custom ? '' : picked.name);
  const [size, setSize] = useState(picked.ml ? String(Math.round(toUnit(picked.ml, unit) * 10) / 10) : '');
  const [servings, setServings] = useState('1');
  const [save, setSave] = useState(true);

  const sizeNum = parseFloat(size) || 0;
  const n = parseFloat(servings) || 0;
  const totalMl = fromUnit(sizeNum * n, unit);

  function submit() {
    if (!(sizeNum > 0) || !(n > 0)) {
      Alert.alert('Enter an amount', `How much liquid is in one serving, in ${unit}?`);
      return;
    }
    const base = name.trim() || 'Drink';
    if (picked.custom && save && name.trim()) {
      const ml = Math.round(fromUnit(sizeNum, unit));
      if (!s.settings.mine.some((m) => m.name === base && m.ml === ml)) {
        s.saveSettings({ mine: [...s.settings.mine, { id: uid(), name: base, ml }] }).catch(() => {});
      }
    }
    onAdd(n === 1 ? base : `${base} × ${n}`, totalMl);
  }

  const step = (d: number) => setServings(String(Math.max(0.25, Math.round(((parseFloat(servings) || 0) + d) * 4) / 4)));

  return (
    <Card>
      <H2 style={{ fontSize: 22 }}>{picked.custom ? 'Custom drink' : picked.name}</H2>
      {picked.custom ? (
        <Field label="Drink name">
          <TextInput style={[inputStyle(c), { flex: 1 }]} placeholder="e.g. Iced latte" placeholderTextColor={c.muted} value={name} onChangeText={setName} autoFocus />
        </Field>
      ) : null}
      <Field label={picked.custom ? 'Amount of liquid' : 'Serving size'}>
        <TextInput style={[inputStyle(c), { width: 100 }]} keyboardType="decimal-pad" value={size} onChangeText={setSize} placeholder="0" placeholderTextColor={c.muted} />
        <Muted>{unit}</Muted>
      </Field>
      <Field label="Servings">
        <StepButton label="−" onPress={() => step(-0.5)} />
        <TextInput style={[inputStyle(c), { width: 70, textAlign: 'center' }]} keyboardType="decimal-pad" value={servings} onChangeText={setServings} />
        <StepButton label="+" onPress={() => step(0.5)} />
      </Field>
      {picked.custom ? (
        <View style={styles.rowBetween}>
          <Text style={{ color: c.ink }}>Save to My drinks for next time</Text>
          <Switch value={save} onValueChange={setSave} trackColor={{ true: c.water }} />
        </View>
      ) : null}
      <View style={styles.rowBetween}>
        <Muted>Total</Muted>
        <Text style={{ color: c.ink, fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{fmtU(totalMl, unit)}</Text>
      </View>
      <PrimaryButton title="Add to diary" onPress={submit} />
      <PrimaryButton title="Back to list" kind="outline" onPress={onBack} />
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.rowBetween, { borderBottomWidth: 1, borderBottomColor: c.line, paddingBottom: 12, flexWrap: 'wrap' }]}>
      <Text style={{ color: c.ink, fontWeight: '500' }}>{label}</Text>
      <View style={[styles.row, { flexShrink: 1 }]}>{children}</View>
    </View>
  );
}

function StepButton({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={{ width: 38, height: 38, borderRadius: 8, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.ink, fontSize: 20 }}>{label}</Text>
    </Pressable>
  );
}
