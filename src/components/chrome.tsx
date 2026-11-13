import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/constants/theme';
import { prettyDay, shiftDay, today } from '@/lib/model';
import { useStore } from '@/lib/store';

function IconButton({ name, onPress, label, disabled }: { name: string; onPress: () => void; label: string; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({ pressed }) => ({ padding: 6, opacity: disabled ? 0.3 : pressed ? 0.6 : 1 })}>
      <SymbolView name={name as never} size={20} tintColor={c.ink} />
    </Pressable>
  );
}

/** Screen title with optional day switcher and a settings shortcut. */
export function TopBar({ title, dayNav }: { title?: string; dayNav?: boolean }) {
  const c = useColors();
  const { selectedDay, setSelectedDay } = useStore();
  const isToday = selectedDay >= today();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
      <Text style={{ color: c.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 }} numberOfLines={1}>
        {title ?? prettyDay(selectedDay)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {dayNav ? (
          <>
            <IconButton name="chevron.left" label="Previous day" onPress={() => setSelectedDay(shiftDay(selectedDay, -1))} />
            <IconButton name="chevron.right" label="Next day" disabled={isToday} onPress={() => setSelectedDay(shiftDay(selectedDay, 1))} />
          </>
        ) : null}
        <IconButton name="gearshape" label="Settings" onPress={() => router.push('/settings')} />
      </View>
    </View>
  );
}

/** Round "+" button that opens Add drink. */
export function FloatingAdd({ meal }: { meal?: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityLabel="Add drink"
      accessibilityRole="button"
      onPress={() => router.push(meal ? { pathname: '/add', params: { meal } } : '/add')}
      style={({ pressed }) => ({
        position: 'absolute',
        right: 20,
        bottom: insets.bottom + 16,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: c.water,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#0e5f86',
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}>
      <SymbolView name="plus" size={26} tintColor="#ffffff" weight="bold" />
    </Pressable>
  );
}
