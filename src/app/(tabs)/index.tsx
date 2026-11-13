import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';

import { FloatingAdd, TopBar } from '@/components/chrome';
import { Avatar, Bar, Body, Card, CardHeader, Chip, DayChart, Eyebrow, LinkButton, Muted, Pill, Ring, Screen, styles } from '@/components/ui';
import { useColors } from '@/constants/theme';
import { catalog, fmt, fmtU, frequentDrinks, mealNow, recommend, shiftDay, shortWeekday, streak, today, totalsByDay } from '@/lib/model';
import { dayTotal, useStore } from '@/lib/store';

export default function Home() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const s = useStore();
  const unit = s.settings.unit;
  const goal = s.profile?.goal_ml ?? 2000;
  const day = s.selectedDay;
  const isToday = day === today();
  const dayDrinks = s.drinks.filter((d) => d.day === day);
  const total = dayDrinks.reduce((a, d) => a + d.ml, 0);
  const remaining = goal - total;
  const pct = goal ? total / goal : 0;
  const totals = totalsByDay(s.drinks);
  const t = today();
  let sum7 = 0;
  for (let i = 0; i < 7; i++) sum7 += totals.get(shiftDay(t, -i)) ?? 0;
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const k = shiftDay(t, i - 6);
    return { key: k, label: i === 6 ? 'Today' : shortWeekday(k), value: totals.get(k) ?? 0 };
  });
  const rec = recommend(s.settings.body);
  const st = streak(totals, goal);

  // Quick add: your most-logged drinks, then the basics.
  const freq = frequentDrinks(s.drinks).slice(0, 4);
  const seen = new Set(freq.map((f) => f.name + '|' + f.ml));
  const basics = catalog(s.settings).filter((x) => ['Glass of water', 'Water bottle', 'Mug of water', 'Coconut water'].includes(x.name));
  const quick = [...freq, ...basics.filter((b) => !seen.has(b.name + '|' + b.ml))].slice(0, 6);

  const sharingFriends = s.friends
    .filter((f) => f.profile.sharing)
    .map((f) => ({ ...f, today: dayTotal(f.drinks, t) }))
    .sort((a, b) => b.today / (b.profile.goal_ml || 1) - a.today / (a.profile.goal_ml || 1));

  async function quickAdd(name: string, ml: number) {
    try {
      await s.addDrink({ name, ml, meal: isToday ? mealNow() : 'afternoon' });
    } catch (e) {
      Alert.alert("Couldn't save that drink", e instanceof Error ? e.message : 'Try again.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}>
        <TopBar dayNav />

        <Card>
          <View style={[styles.row, { gap: 18 }]}>
            <Ring pct={pct} size={140}>
              <Text style={{ color: c.ink, fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                {remaining === 0 ? '✓' : fmt(Math.abs(remaining), unit)}
              </Text>
              <Muted style={{ fontSize: 12 }}>{remaining > 0 ? `${unit} remaining` : remaining === 0 ? 'Goal reached' : `${unit} over goal`}</Muted>
            </Ring>
            <View style={{ flex: 1, gap: 10 }}>
              <Legend color={c.track} label="Daily goal" value={fmtU(goal, unit)} />
              <Legend color={c.water} label="Drank" value={fmtU(total, unit)} />
              <Legend color={c.good} label="Drinks" value={String(dayDrinks.length)} />
            </View>
          </View>
          <View style={[styles.rowBetween, { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12 }]}>
            {!rec ? (
              <>
                <Muted style={{ flex: 1 }}>How much should you drink? Add your age and sex to get a goal.</Muted>
                <LinkButton title="Find out" onPress={() => router.push('/settings')} />
              </>
            ) : Math.abs(rec.total - goal) >= 50 ? (
              <>
                <Muted style={{ flex: 1 }}>Recommended for you: {fmtU(rec.total, unit)}</Muted>
                <LinkButton title="Use it" onPress={() => s.saveProfile({ goal_ml: rec.total }).catch(() => {})} />
              </>
            ) : (
              <Muted>Your goal matches the recommendation for your age and sex.</Muted>
            )}
          </View>
        </Card>

        {s.profile?.sharing ? (
          <Card>
            <CardHeader title="Friends today" action="See all" onAction={() => router.navigate('/friends')} />
            {sharingFriends.length === 0 ? (
              <Muted>Add a friend with their code on the Friends tab and they&apos;ll show up here.</Muted>
            ) : (
              sharingFriends.map((f) => {
                const g = f.profile.goal_ml;
                const done = g > 0 && f.today >= g;
                return (
                  <Pressable key={f.profile.id} onPress={() => router.navigate('/friends')} style={[styles.row, { gap: 10 }]}>
                    <Avatar name={f.profile.display_name} size={34} />
                    <View style={{ flex: 1, gap: 5 }}>
                      <View style={styles.rowBetween}>
                        <Body style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                          {f.profile.display_name}
                        </Body>
                        <Muted style={{ fontVariant: ['tabular-nums'] }}>
                          {fmt(f.today, unit)} / {fmtU(g, unit)}
                        </Muted>
                      </View>
                      <Bar pct={g ? f.today / g : 0} height={6} />
                    </View>
                    <Pill text={done ? 'Done' : `${g ? Math.round((f.today / g) * 100) : 0}%`} good={done} />
                  </Pressable>
                );
              })
            )}
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Quick add" action="More" onAction={() => router.push('/add')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {quick.map((q) => (
              <Chip key={q.name + q.ml} label={'+ ' + q.name} sub={fmtU(q.ml, unit)} onPress={() => quickAdd(q.name, q.ml)} />
            ))}
            <Chip label="+ Custom drink" dashed onPress={() => router.push({ pathname: '/add', params: { custom: '1' } })} />
          </ScrollView>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1, gap: 2 }}>
            <Eyebrow>Streak</Eyebrow>
            <Text style={{ color: c.ink, fontSize: 28, fontWeight: '800' }}>{st}</Text>
            <Muted>{st === 1 ? 'day at goal' : 'days at goal'}</Muted>
          </Card>
          <Card style={{ flex: 1, gap: 2 }}>
            <Eyebrow>7-day average</Eyebrow>
            <Text style={{ color: c.ink, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{fmt(sum7 / 7, unit)}</Text>
            <Muted>{unit} per day</Muted>
          </Card>
        </View>

        <Card>
          <CardHeader title="This week" action="Progress" onAction={() => router.navigate('/progress')} />
          <DayChart
            days={days7}
            goal={goal}
            width={width - 64}
            height={150}
            formatTick={(v) => fmt(v, unit)}
            selected={day}
            onPressDay={s.setSelectedDay}
          />
        </Card>
      </Screen>
      <FloatingAdd />
    </View>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  const c = useColors();
  return (
    <View style={[styles.row, { gap: 8 }]}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ color: c.ink, flex: 1 }}>{label}</Text>
      <Text style={{ color: c.ink, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}
