// Bridge between the app and the Home Screen widget.
// The widget only exists when it's turned on in app.config.ts (it needs a paid
// Apple developer account for App Groups), so every call here is a safe no-op otherwise.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { QuenchyWidgetProps, WidgetPending } from '@/widgets/quenchy-widget';

export const widgetEnabled =
  Platform.OS === 'ios' && Boolean((Constants.expoConfig?.extra as { widgetEnabled?: boolean } | undefined)?.widgetEnabled);

type WidgetModule = typeof import('@/widgets/quenchy-widget');
let mod: WidgetModule | null | undefined;

function widgetModule(): WidgetModule | null {
  if (mod !== undefined) return mod;
  if (!widgetEnabled) return (mod = null);
  try {
    // Loaded lazily so builds without the widget never touch its native module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('@/widgets/quenchy-widget') as WidgetModule;
  } catch (e) {
    console.warn('[Quenchy] Widget unavailable', e);
    mod = null;
  }
  return mod;
}

let lastProps: QuenchyWidgetProps | null = null;

/** Drinks tapped on the widget that the app hasn't saved yet. */
export async function readPendingWidgetDrinks(): Promise<WidgetPending[]> {
  const m = widgetModule();
  if (!m) return [];
  try {
    const timeline = await m.QuenchyWidget.getTimeline();
    const latest = timeline.reduce<(typeof timeline)[number] | null>(
      (a, e) => (!a || e.date.getTime() >= a.date.getTime() ? e : a),
      null
    );
    return latest?.props?.pending ?? [];
  } catch {
    return [];
  }
}

/** Show fresh totals on the widget. Pass `pending` to keep drinks the app couldn't save yet. */
export function updateWidget(props: Omit<QuenchyWidgetProps, 'pending'>, pending: WidgetPending[] = []) {
  const m = widgetModule();
  if (!m) return;
  const next = { ...props, pending };
  if (lastProps && JSON.stringify(lastProps) === JSON.stringify(next)) return;
  try {
    m.QuenchyWidget.updateSnapshot(next);
    lastProps = next;
  } catch (e) {
    console.warn('[Quenchy] Widget update failed', e);
  }
}

/** Calls `fn` whenever someone taps a button on the widget while the app is running. */
export function onWidgetTap(fn: () => void): () => void {
  if (!widgetModule()) return () => {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { addUserInteractionListener } = require('expo-widgets') as typeof import('expo-widgets');
    const sub = addUserInteractionListener(() => fn());
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
