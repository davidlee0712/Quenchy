// Home Screen + Lock Screen widget.
//
// The function marked 'widget' is copied into the widget as source text, so it
// can't use anything defined outside it: every helper lives inside the function.
// Keep this file's imports to expo-widgets and @expo/ui only.
import { Button, Gauge, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  lineLimit,
  monospacedDigit,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type WidgetDrinkButton = { label: string; name: string; ml: number };
export type WidgetPending = { id: string; name: string; ml: number; ts: number };
export type WidgetFriend = { name: string; drank: number; goal: number };

export type QuenchieWidgetProps = {
  day: string; // YYYY-MM-DD the totals belong to
  drank: number; // ml
  goal: number; // ml
  unit: 'ml' | 'oz';
  buttons: WidgetDrinkButton[];
  pending: WidgetPending[]; // drinks logged from the widget, not yet saved by the app
  friends: WidgetFriend[];
};

export const EMPTY_WIDGET: QuenchieWidgetProps = {
  day: '',
  drank: 0,
  goal: 2000,
  unit: 'ml',
  buttons: [
    { label: '+ Glass', name: 'Glass of water', ml: 250 },
    { label: '+ Bottle', name: 'Water bottle', ml: 750 },
  ],
  pending: [],
  friends: [],
};

export const QuenchieWidget = createWidget<QuenchieWidgetProps>(
  'Quenchie',
  (props: QuenchieWidgetProps, env: WidgetEnvironment) => {
    'widget';
    const WATER = '#1d93c9';
    const GOOD = '#1e8a5a';
    const dark = env.colorScheme === 'dark';
    const BG = dark ? '#0f2230' : '#ffffff';
    const MUTED = dark ? '#8ea4b3' : '#627789';

    const now = new Date();
    const p2 = (n: number) => (n < 10 ? '0' : '') + n;
    const todayKey = now.getFullYear() + '-' + p2(now.getMonth() + 1) + '-' + p2(now.getDate());
    const drank = props.day === todayKey ? props.drank : 0; // a new day starts at zero
    const goal = props.goal > 0 ? props.goal : 2000;
    const pct = Math.min(1, drank / goal);
    const left = Math.max(0, goal - drank);
    const done = drank >= goal;

    const commas = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const amount = (ml: number) =>
      props.unit === 'oz' ? Math.round((ml / 29.5735) * 10) / 10 + ' oz' : commas(ml) + ' ml';

    // Tapping a drink button updates the widget right away and queues the drink
    // for the app to save the next time it opens.
    const log = (b: WidgetDrinkButton) => () => ({
      day: todayKey,
      drank: drank + b.ml,
      pending: (props.pending || []).concat([
        { id: 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: b.name, ml: b.ml, ts: Date.now() },
      ]),
    });

    const buttons = (props.buttons || []).slice(0, 2);
    const family = env.widgetFamily || 'systemSmall';
    const leftLabel = done ? 'Goal reached' : amount(left) + ' left';

    if (family === 'accessoryInline') {
      return <Text>{done ? 'Water goal reached' : amount(left) + ' water left'}</Text>;
    }

    if (family === 'accessoryCircular') {
      return (
        <Gauge value={pct} min={0} max={1} modifiers={[gaugeStyle('circularCapacity'), widgetURL('quenchie://')]}>
          <Text>{Math.round(pct * 100) + '%'}</Text>
        </Gauge>
      );
    }

    if (family === 'accessoryRectangular') {
      return (
        <VStack alignment="leading" spacing={2} modifiers={[widgetURL('quenchie://')]}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>Water</Text>
          <Text modifiers={[monospacedDigit()]}>{amount(drank) + ' of ' + amount(goal)}</Text>
          <Gauge value={pct} min={0} max={1} modifiers={[gaugeStyle('linearCapacity')]} />
        </VStack>
      );
    }

    const ring = (
      <Gauge
        value={pct}
        min={0}
        max={1}
        modifiers={[gaugeStyle('circularCapacity'), tint(done ? GOOD : WATER), frame({ width: 58, height: 58 })]}>
        <Text modifiers={[font({ size: 13, weight: 'bold', design: 'rounded' })]}>{Math.round(pct * 100) + '%'}</Text>
      </Gauge>
    );

    const drinkButtons = buttons.map((b, i) => (
      <Button
        key={'b' + i}
        label={b.label}
        target={'log-' + i}
        onPress={log(b)}
        modifiers={[buttonStyle('borderedProminent'), tint(WATER), font({ size: 12, weight: 'semibold' })]}
      />
    ));

    if (family === 'systemSmall') {
      return (
        <VStack
          alignment="leading"
          spacing={6}
          modifiers={[containerBackground(BG, 'widget'), widgetURL('quenchie://')]}>
          <HStack spacing={8}>
            {ring}
            <VStack alignment="leading" spacing={1}>
              <Text modifiers={[font({ size: 17, weight: 'bold', design: 'rounded' }), monospacedDigit(), lineLimit(1)]}>
                {amount(drank)}
              </Text>
              <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED), lineLimit(1)]}>{'of ' + amount(goal)}</Text>
            </VStack>
          </HStack>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(done ? GOOD : WATER), lineLimit(1)]}>
            {leftLabel}
          </Text>
          <Spacer />
          <HStack spacing={6}>{drinkButtons}</HStack>
        </VStack>
      );
    }

    // systemMedium (and larger): ring + totals on the left, buttons and friends on the right.
    const friends = (props.friends || []).slice(0, family === 'systemMedium' ? 2 : 5);
    return (
      <HStack spacing={14} modifiers={[containerBackground(BG, 'widget'), widgetURL('quenchie://')]}>
        <VStack alignment="leading" spacing={6}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(MUTED)]}>Quenchie</Text>
          {ring}
          <Text modifiers={[font({ size: 16, weight: 'bold', design: 'rounded' }), monospacedDigit(), lineLimit(1)]}>
            {amount(drank)}
          </Text>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(done ? GOOD : WATER), lineLimit(1)]}>
            {leftLabel}
          </Text>
        </VStack>
        <VStack alignment="leading" spacing={6}>
          <HStack spacing={6}>{drinkButtons}</HStack>
          <Spacer />
          {friends.length === 0 ? (
            <Text modifiers={[font({ size: 11 }), foregroundStyle(MUTED)]}>Link friends in the app to see them here.</Text>
          ) : (
            friends.map((f, i) => (
              <HStack key={'f' + i} spacing={6}>
                <Text modifiers={[font({ size: 12, weight: 'semibold' }), lineLimit(1)]}>{f.name}</Text>
                <Spacer />
                <Text
                  modifiers={[
                    font({ size: 12 }),
                    monospacedDigit(),
                    foregroundStyle(f.drank >= f.goal && f.goal > 0 ? GOOD : MUTED),
                  ]}>
                  {(f.goal > 0 ? Math.min(100, Math.round((f.drank / f.goal) * 100)) : 0) + '%'}
                </Text>
              </HStack>
            ))
          )}
        </VStack>
      </HStack>
    );
  },
  EMPTY_WIDGET
);
