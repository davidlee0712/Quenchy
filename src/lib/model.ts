// Plain data helpers shared by every screen. No React, no network.

export type Meal = 'morning' | 'afternoon' | 'evening';
export type Unit = 'ml' | 'oz';
export type Sex = '' | 'female' | 'male' | 'pregnant' | 'breastfeeding';
export type Activity = 'sitting' | 'onFeet' | 'physical';

// How active a normal day is, separate from workouts. Walking all day counts here.
export const ACTIVITY_LEVELS: { value: Activity; label: string; hint: string; ml: number }[] = [
  { value: 'sitting', label: 'Mostly sitting', hint: 'Desk, classes, driving. Some short walks.', ml: 0 },
  { value: 'onFeet', label: 'On my feet a lot', hint: 'Walking most of the day, like campus, retail or 10,000+ steps.', ml: 250 },
  { value: 'physical', label: 'Physical work', hint: 'Lifting, carrying or labour for hours.', ml: 500 },
];

export type Drink = {
  id: string;
  user_id: string;
  day: string; // YYYY-MM-DD in the drinker's local time
  ts: string; // ISO timestamp
  name: string;
  ml: number;
  meal: Meal;
  client_id?: string | null;
};

export type Profile = {
  id: string;
  display_name: string;
  friend_code: string;
  goal_ml: number;
  sharing: boolean;
};

export type SavedDrink = { id: string; name: string; ml: number };

export type Settings = {
  bottleMl: number;
  unit: Unit;
  mine: SavedDrink[];
  body: { age: number | null; sex: Sex; activity: Activity; exercise: number; hot: boolean };
  reminders: { enabled: boolean; startHour: number; endHour: number; everyHours: number };
};

export const DEFAULT_SETTINGS: Settings = {
  bottleMl: 750,
  unit: 'ml',
  mine: [],
  body: { age: null, sex: '', activity: 'sitting', exercise: 0, hot: false },
  reminders: { enabled: false, startHour: 9, endHour: 21, everyHours: 2 },
};

export function mergeSettings(data: unknown): Settings {
  const d = (data ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...d,
    mine: Array.isArray(d.mine) ? d.mine : [],
    body: { ...DEFAULT_SETTINGS.body, ...(d.body ?? {}) },
    reminders: { ...DEFAULT_SETTINGS.reminders, ...(d.reminders ?? {}) },
  };
}

// ---------- drink catalog ----------

export type CatalogItem = { name: string; ml: number; category: string; mine?: boolean };

export function catalog(settings: Settings): CatalogItem[] {
  return [
    { name: 'Glass of water', ml: 250, category: 'Water' },
    { name: 'Large glass of water', ml: 400, category: 'Water' },
    { name: 'Water bottle', ml: settings.bottleMl, category: 'Water' },
    { name: 'Mug of water', ml: 350, category: 'Water' },
    { name: 'Sparkling water can', ml: 330, category: 'Water' },
    { name: 'A few sips', ml: 50, category: 'Water' },
    { name: 'Coconut water', ml: 330, category: 'Other' },
    { name: 'Tea, mug', ml: 300, category: 'Hot drinks' },
    { name: 'Coffee, cup', ml: 240, category: 'Hot drinks' },
    { name: 'Espresso', ml: 30, category: 'Hot drinks' },
    { name: 'Herbal tea, cup', ml: 240, category: 'Hot drinks' },
    { name: 'Milk, glass', ml: 250, category: 'Other' },
    { name: 'Juice, small glass', ml: 200, category: 'Other' },
    { name: 'Sports drink bottle', ml: 500, category: 'Other' },
    { name: 'Soup, bowl', ml: 300, category: 'Other' },
    { name: 'Smoothie', ml: 350, category: 'Other' },
    ...settings.mine.map((m) => ({ name: m.name, ml: m.ml, category: 'My drinks', mine: true })),
  ];
}

export type Frequent = { name: string; ml: number; count: number; last: number };

export function frequentDrinks(drinks: Drink[]): Frequent[] {
  const map = new Map<string, Frequent>();
  for (const d of drinks) {
    const name = d.name.replace(/ × [\d.]+$/, '');
    const key = name + '|' + d.ml;
    const e = map.get(key) ?? { name, ml: d.ml, count: 0, last: 0 };
    e.count++;
    e.last = Math.max(e.last, Date.parse(d.ts));
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.last - a.last);
}

// ---------- dates ----------

const pad = (n: number) => String(n).padStart(2, '0');
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function today(): string {
  return dayKey(new Date());
}
export function parseDay(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function shiftDay(k: string, n: number): string {
  const d = parseDay(k);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}
export function prettyDay(k: string): string {
  const t = today();
  if (k === t) return 'Today';
  if (k === shiftDay(t, -1)) return 'Yesterday';
  return parseDay(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
export function shortWeekday(k: string): string {
  return parseDay(k).toLocaleDateString(undefined, { weekday: 'short' });
}
export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
export function mealForHour(h: number): Meal {
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}
export function mealNow(): Meal {
  return mealForHour(new Date().getHours());
}
export const MEALS: { key: Meal; name: string; hint: string }[] = [
  { key: 'morning', name: 'Morning', hint: 'Before noon' },
  { key: 'afternoon', name: 'Afternoon', hint: 'Noon to 5 pm' },
  { key: 'evening', name: 'Evening', hint: 'After 5 pm' },
];

// A timestamp on `day`: now if it's today, otherwise the current clock time on that date.
export function stampFor(day: string): Date {
  if (day === today()) return new Date();
  const d = parseDay(day);
  const n = new Date();
  d.setHours(n.getHours(), n.getMinutes());
  return d;
}

// ---------- units ----------

export const OZ = 29.5735;
export function toUnit(ml: number, unit: Unit): number {
  return unit === 'oz' ? ml / OZ : ml;
}
export function fromUnit(v: number, unit: Unit): number {
  return unit === 'oz' ? v * OZ : v;
}
export function fmt(ml: number, unit: Unit): string {
  const v = toUnit(ml, unit);
  return unit === 'oz' ? (Math.round(v * 10) / 10).toLocaleString() : Math.round(v).toLocaleString();
}
export function fmtU(ml: number, unit: Unit): string {
  return `${fmt(ml, unit)} ${unit}`;
}

// ---------- totals ----------

export function totalsByDay(drinks: Drink[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of drinks) m.set(d.day, (m.get(d.day) ?? 0) + d.ml);
  return m;
}

// Days in a row at goal, ending today (or yesterday while today is still in progress).
export function streak(totals: Map<string, number>, goal: number): number {
  if (goal <= 0) return 0;
  let k = today();
  if ((totals.get(k) ?? 0) < goal) k = shiftDay(k, -1);
  let n = 0;
  while ((totals.get(k) ?? 0) >= goal && n < 3650) {
    n++;
    k = shiftDay(k, -1);
  }
  return n;
}

// ---------- daily need ----------

export type Recommendation = { total: number; base: number; activity: number; exercise: number; hot: number; group: string };

// Water from drinks per day, based on the US National Academies' adequate intake
// (total water minus the ~20% that usually comes from food), plus daily activity, workouts and heat.
export function recommend(body: Settings['body']): Recommendation | null {
  const age = Number(body.age);
  if (!age || !body.sex) return null;
  const male = body.sex === 'male';
  let base: number;
  let group: string;
  if (age < 4) [base, group] = [900, 'children 1–3'];
  else if (age < 9) [base, group] = [1200, 'children 4–8'];
  else if (age < 14) [base, group] = [male ? 1800 : 1600, `${male ? 'boys' : 'girls'} 9–13`];
  else if (age < 19) [base, group] = [male ? 2600 : 1800, `${male ? 'boys' : 'girls'} 14–18`];
  else [base, group] = [male ? 3000 : 2200, `${male ? 'men' : 'women'} 19+`];
  if (age >= 14 && body.sex === 'pregnant') [base, group] = [2300, 'pregnancy'];
  if (age >= 14 && body.sex === 'breastfeeding') [base, group] = [3100, 'breastfeeding'];
  const activity = ACTIVITY_LEVELS.find((a) => a.value === body.activity)?.ml ?? 0;
  const exercise = Math.max(0, Number(body.exercise) || 0) * 12; // ~350 ml per 30 min of sweaty exercise
  const hot = body.hot ? 500 : 0;
  return { total: Math.round((base + activity + exercise + hot) / 50) * 50, base, activity, exercise, hot, group };
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
