import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, Share, Switch, Text, TextInput, View } from 'react-native';

import { TopBar } from '@/components/chrome';
import { Avatar, Bar, Body, Card, H2, Muted, Pill, PrimaryButton, Screen, inputStyle, styles } from '@/components/ui';
import { useColors } from '@/constants/theme';
import { fmt, fmtU, shiftDay, streak, timeOf, today, totalsByDay } from '@/lib/model';
import { type Friend, dayTotal, useStore } from '@/lib/store';

export default function Friends() {
  const c = useColors();
  const s = useStore();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const myCode = s.profile?.friend_code ?? '······';

  async function add() {
    if (code.trim().length < 4) return;
    setBusy(true);
    try {
      await s.addFriend(code);
      setCode('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Couldn't add friend", e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(f: Friend) {
    Alert.alert(`Remove ${f.profile.display_name}?`, 'You will stop seeing each other’s progress.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => s.removeFriend(f.profile.id).catch(() => {}) },
    ]);
  }

  const t = today();
  const sorted = [...s.friends].sort(
    (a, b) => dayTotal(b.drinks, t) / (b.profile.goal_ml || 1) - dayTotal(a.drinks, t) / (a.profile.goal_ml || 1)
  );

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await s.refresh().catch(() => {});
            setRefreshing(false);
          }}
        />
      }>
      <TopBar title="Friends" />

      <Card>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body style={{ fontWeight: '700' }}>Share my progress</Body>
            <Muted>Friends see today&apos;s total, your goal, streak and last 7 days. Never your settings.</Muted>
          </View>
          <Switch
            value={!!s.profile?.sharing}
            onValueChange={(v) => s.saveProfile({ sharing: v }).catch((e) => Alert.alert("Couldn't save", String(e?.message ?? e)))}
            trackColor={{ true: c.water }}
          />
        </View>
      </Card>

      <Card>
        <H2>Link with someone</H2>
        <Muted>Send them your code. When either of you adds the other&apos;s code, you&apos;re linked both ways.</Muted>
        <Pressable
          onPress={() => Share.share({ message: `Add me on Quenchy! My friend code is ${myCode}` })}
          style={({ pressed }) => [styles.rowBetween, { backgroundColor: c.bg, borderRadius: 12, padding: 14, opacity: pressed ? 0.7 : 1 }]}>
          <View>
            <Muted>Your friend code</Muted>
            <Text style={{ color: c.ink, fontSize: 26, fontWeight: '800', letterSpacing: 4, fontVariant: ['tabular-nums'] }} selectable>
              {myCode}
            </Text>
          </View>
          <Text style={{ color: c.water, fontWeight: '700' }}>Share</Text>
        </Pressable>
        <View style={[styles.row, { gap: 8 }]}>
          <TextInput
            style={[inputStyle(c), { flex: 1, letterSpacing: 3, fontWeight: '700' }]}
            placeholder="Friend's code"
            placeholderTextColor={c.muted}
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            autoCapitalize="characters"
            autoCorrect={false}
            onSubmitEditing={add}
          />
          <PrimaryButton title={busy ? '…' : 'Add'} onPress={add} disabled={busy || code.length < 4} />
        </View>
      </Card>

      {sorted.length === 0 ? (
        <Card>
          <Muted>No friends linked yet. Once you add someone&apos;s code, their progress shows up here and on your Home screen.</Muted>
        </Card>
      ) : (
        sorted.map((f) => <FriendCard key={f.profile.id} friend={f} onLongPress={() => confirmRemove(f)} />)
      )}
      {sorted.length > 0 ? <Muted style={{ textAlign: 'center' }}>Press and hold a friend to remove them.</Muted> : null}
    </Screen>
  );
}

function FriendCard({ friend, onLongPress }: { friend: Friend; onLongPress: () => void }) {
  const c = useColors();
  const { settings } = useStore();
  const unit = settings.unit;
  const p = friend.profile;
  const t = today();
  const totals = totalsByDay(friend.drinks);
  const tot = totals.get(t) ?? 0;
  const goal = p.goal_ml;
  const done = goal > 0 && tot >= goal;
  const st = streak(totals, goal);
  const last = friend.drinks[0];

  return (
    <Pressable onLongPress={onLongPress}>
      <Card>
        <View style={[styles.row, { gap: 10 }]}>
          <Avatar name={p.display_name} />
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '700' }} numberOfLines={1}>
              {p.display_name}
            </Body>
            <Muted>{p.sharing ? (last ? `Last: ${last.name}, ${last.day === t ? timeOf(last.ts) : 'earlier'}` : 'No drinks yet') : 'Not sharing right now'}</Muted>
          </View>
          {p.sharing ? <Pill text={done ? 'Goal reached' : `${goal ? Math.round((tot / goal) * 100) : 0}%`} good={done} /> : null}
        </View>
        {p.sharing ? (
          <>
            <View style={styles.rowBetween}>
              <Text style={{ color: c.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{fmtU(tot, unit)}</Text>
              <Muted style={{ fontVariant: ['tabular-nums'] }}>{done ? `of ${fmtU(goal, unit)}` : `${fmt(goal - tot, unit)} left of ${fmtU(goal, unit)}`}</Muted>
            </View>
            <Bar pct={goal ? tot / goal : 0} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 34 }} accessibilityLabel="Last 7 days">
              {Array.from({ length: 7 }, (_, i) => {
                const v = totals.get(shiftDay(t, i - 6)) ?? 0;
                return (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: `${Math.max(4, Math.min(100, goal ? (v / goal) * 100 : 0))}%`,
                      backgroundColor: goal && v >= goal ? c.water : c.water2,
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                    }}
                  />
                );
              })}
            </View>
            <Muted>{st ? `${st}-day streak` : 'No streak yet'}</Muted>
          </>
        ) : null}
      </Card>
    </Pressable>
  );
}
