import { useState } from 'react';
import { Alert, Pressable, Switch, Text, TextInput, View } from 'react-native';

import { Card, Divider, Eyebrow, H2, Muted, PrimaryButton, Screen, inputStyle, styles } from '@/components/ui';
import { radius, useColors } from '@/constants/theme';
import { fmtU, fromUnit, recommend, type Settings, type Sex, toUnit, type Unit, uid } from '@/lib/model';
import { applyReminders, reminderHours } from '@/lib/reminders';
import { useStore } from '@/lib/store';
import { widgetEnabled } from '@/lib/widget-sync';

const SEXES: { value: Exclude<Sex, ''>; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'pregnant', label: 'Pregnant' },
  { value: 'breastfeeding', label: 'Breastfeeding' },
];

export default function SettingsScreen() {
  const c = useColors();
  const s = useStore();
  const st = s.settings;
  const unit = st.unit;
  const goal = s.profile?.goal_ml ?? 2000;
  const rec = recommend(st.body);

  const fail = (e: unknown) => Alert.alert("Couldn't save", e instanceof Error ? e.message : 'Try again.');
  const saveBody = (patch: Partial<Settings['body']>) => s.saveSettings({ body: { ...st.body, ...patch } }).catch(fail);
  const saveReminders = async (patch: Partial<Settings['reminders']>) => {
    const next = { ...st.reminders, ...patch };
    if (next.startHour > next.endHour) return;
    try {
      await s.saveSettings({ reminders: next });
      const ok = await applyReminders(next);
      if (!ok) {
        await s.saveSettings({ reminders: { ...next, enabled: false } });
        Alert.alert('Notifications are off', 'Allow notifications for Quenchie in the iPhone Settings app to get reminders.');
      }
    } catch (e) {
      fail(e);
    }
  };

  const [newName, setNewName] = useState('');
  const [newAmt, setNewAmt] = useState('');

  return (
    <Screen>
      <Card>
        <H2>About you</H2>
        <Row label="Age">
          <NumberField value={st.body.age} onCommit={(v) => saveBody({ age: v && v > 0 && v < 121 ? Math.round(v) : null })} placeholder="Years" />
        </Row>
        <View style={{ gap: 8 }}>
          <Text style={{ color: c.ink, fontWeight: '500' }}>Sex</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SEXES.map((x) => (
              <Pressable
                key={x.value}
                onPress={() => saveBody({ sex: x.value })}
                accessibilityRole="button"
                accessibilityState={{ selected: st.body.sex === x.value }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: st.body.sex === x.value ? c.water : c.line,
                  backgroundColor: st.body.sex === x.value ? c.water : 'transparent',
                }}>
                <Text style={{ color: st.body.sex === x.value ? '#fff' : c.ink, fontWeight: '600' }}>{x.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Row label="Exercise on a typical day">
          <NumberField value={st.body.exercise || null} onCommit={(v) => saveBody({ exercise: Math.max(0, Math.round(v ?? 0)) })} placeholder="0" />
          <Muted>min</Muted>
        </Row>
        <Row label="I live somewhere hot or humid">
          <Switch value={st.body.hot} onValueChange={(v) => saveBody({ hot: v })} trackColor={{ true: c.water }} />
        </Row>
        <View style={{ backgroundColor: c.bg, borderRadius: 12, padding: 14, gap: 6 }}>
          {rec ? (
            <>
              <Eyebrow>Your daily need from drinks</Eyebrow>
              <Text style={{ color: c.ink, fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{fmtU(rec.total, unit)}</Text>
              <Muted>
                {[
                  `Base for ${rec.group}: ${fmtU(rec.base, unit)} (about ${Math.round(rec.base / 240)} cups)`,
                  rec.exercise ? `exercise +${fmtU(rec.exercise, unit)}` : '',
                  rec.hot ? `hot climate +${fmtU(rec.hot, unit)}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Muted>
              {Math.abs(rec.total - goal) >= 50 ? (
                <PrimaryButton title="Set as my daily goal" onPress={() => s.saveProfile({ goal_ml: rec.total }).catch(fail)} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
              ) : (
                <Text style={{ color: c.good, fontWeight: '600' }}>✓ This is your daily goal.</Text>
              )}
              <Muted style={{ fontSize: 12 }}>
                A general guideline based on the US National Academies&apos; intake recommendations. Food usually supplies about 20% more. Kidney,
                heart or other conditions can change what&apos;s right for you, so check with a doctor if any apply.
              </Muted>
            </>
          ) : (
            <Muted>Enter your age and sex to see your recommended daily amount.</Muted>
          )}
        </View>
      </Card>

      <Card>
        <H2>Goals</H2>
        <Row label="Daily water goal">
          <NumberField value={round1(toUnit(goal, unit))} onCommit={(v) => v && v > 0 && s.saveProfile({ goal_ml: Math.round(fromUnit(v, unit)) }).catch(fail)} />
          <Muted>{unit}</Muted>
        </Row>
        <Row label="My water bottle size">
          <NumberField value={round1(toUnit(st.bottleMl, unit))} onCommit={(v) => v && v > 0 && s.saveSettings({ bottleMl: Math.round(fromUnit(v, unit)) }).catch(fail)} />
          <Muted>{unit}</Muted>
        </Row>
        <Row label="Units">
          <Segmented value={unit} options={[{ value: 'ml', label: 'ml' }, { value: 'oz', label: 'fl oz' }]} onChange={(v) => s.saveSettings({ unit: v as Unit }).catch(fail)} />
        </Row>
      </Card>

      <Card>
        <H2>My drinks</H2>
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          <TextInput style={[inputStyle(c), { flex: 1, minWidth: 140 }]} placeholder="e.g. Protein shake" placeholderTextColor={c.muted} value={newName} onChangeText={setNewName} />
          <TextInput style={[inputStyle(c), { width: 90 }]} placeholder="Size" placeholderTextColor={c.muted} keyboardType="decimal-pad" value={newAmt} onChangeText={setNewAmt} />
          <Muted>{unit}</Muted>
          <PrimaryButton
            title="Save"
            kind="outline"
            onPress={() => {
              const v = parseFloat(newAmt);
              if (!newName.trim() || !(v > 0)) return;
              s.saveSettings({ mine: [...st.mine, { id: uid(), name: newName.trim(), ml: Math.round(fromUnit(v, unit)) }] }).catch(fail);
              setNewName('');
              setNewAmt('');
            }}
          />
        </View>
        {st.mine.length === 0 ? <Muted>Drinks you save show up under “My drinks” when you add a drink.</Muted> : null}
        {st.mine.map((m) => (
          <View key={m.id} style={styles.rowBetween}>
            <Text style={{ color: c.ink, flex: 1 }}>
              {m.name} · {fmtU(m.ml, unit)}
            </Text>
            <Pressable onPress={() => s.saveSettings({ mine: st.mine.filter((x) => x.id !== m.id) }).catch(fail)} hitSlop={8}>
              <Text style={{ color: c.danger, fontWeight: '600' }}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </Card>

      <Card>
        <H2>Reminders</H2>
        <Row label="Remind me to drink water">
          <Switch value={st.reminders.enabled} onValueChange={(v) => saveReminders({ enabled: v })} trackColor={{ true: c.water }} />
        </Row>
        {st.reminders.enabled ? (
          <>
            <Row label="Every">
              <Segmented
                value={String(st.reminders.everyHours)}
                options={[1, 2, 3].map((h) => ({ value: String(h), label: `${h} h` }))}
                onChange={(v) => saveReminders({ everyHours: Number(v) })}
              />
            </Row>
            <Row label="From">
              <HourStepper value={st.reminders.startHour} min={5} max={st.reminders.endHour} onChange={(h) => saveReminders({ startHour: h })} />
            </Row>
            <Row label="Until">
              <HourStepper value={st.reminders.endHour} min={st.reminders.startHour} max={23} onChange={(h) => saveReminders({ endHour: h })} />
            </Row>
            <Muted>{reminderHours(st.reminders).map(hourLabel).join(', ')}</Muted>
          </>
        ) : null}
      </Card>

      <Card>
        <H2>Account</H2>
        <Row label="Name friends see">
          <TextField value={s.profile?.display_name ?? ''} onCommit={(v) => v.trim() && s.saveProfile({ display_name: v.trim().slice(0, 40) }).catch(fail)} />
        </Row>
        <Muted>Signed in as {s.session?.user.email}</Muted>
        <Divider />
        <Muted>Home Screen widget: {widgetEnabled ? 'on. Long-press your Home Screen and tap Edit, then Add Widget, to add Quenchie.' : 'off in this build (see the README to turn it on).'}</Muted>
        <PrimaryButton title="Sign out" kind="danger" onPress={() => s.signOut()} />
      </Card>
    </Screen>
  );
}

function round1(v: number) {
  return Math.round(v * 10) / 10;
}
function hourLabel(h: number) {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric' });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.rowBetween, { flexWrap: 'wrap' }]}>
      <Text style={{ color: c.ink, fontWeight: '500', flexShrink: 1 }}>{label}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

type NumberFieldProps = { value: number | null; onCommit: (v: number | null) => void; placeholder?: string };
// Keyed on the saved value so the box resets whenever the saved value changes.
function NumberField(props: NumberFieldProps) {
  return <NumberFieldInner key={String(props.value)} {...props} />;
}
function NumberFieldInner({ value, onCommit, placeholder }: NumberFieldProps) {
  const c = useColors();
  const [text, setText] = useState(value == null ? '' : String(value));
  return (
    <TextInput
      style={[inputStyle(c), { width: 96, textAlign: 'right' }]}
      keyboardType="decimal-pad"
      value={text}
      placeholder={placeholder}
      placeholderTextColor={c.muted}
      onChangeText={setText}
      onEndEditing={() => {
        const v = parseFloat(text);
        onCommit(Number.isFinite(v) ? v : null);
      }}
    />
  );
}

type TextFieldProps = { value: string; onCommit: (v: string) => void };
function TextField(props: TextFieldProps) {
  return <TextFieldInner key={props.value} {...props} />;
}
function TextFieldInner({ value, onCommit }: TextFieldProps) {
  const c = useColors();
  const [text, setText] = useState(value);
  return <TextInput style={[inputStyle(c), { minWidth: 160 }]} value={text} onChangeText={setText} onEndEditing={() => onCommit(text)} />;
}

function Segmented({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: c.line, borderRadius: 8, overflow: 'hidden' }}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o.value }}
          style={{ paddingVertical: 7, paddingHorizontal: 14, backgroundColor: value === o.value ? c.water : 'transparent' }}>
          <Text style={{ color: value === o.value ? '#fff' : c.ink, fontWeight: '600' }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function HourStepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (h: number) => void }) {
  const c = useColors();
  const btn = (label: string, next: number, disabled: boolean) => (
    <Pressable
      onPress={() => onChange(next)}
      disabled={disabled}
      style={{ width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : 1 }}>
      <Text style={{ color: c.ink, fontSize: 18 }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      {btn('−', value - 1, value <= min)}
      <Text style={{ color: c.ink, minWidth: 60, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{hourLabel(value)}</Text>
      {btn('+', value + 1, value >= max)}
    </View>
  );
}
