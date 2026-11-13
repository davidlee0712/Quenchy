import { Text, View } from 'react-native';

import { useColors } from '@/constants/theme';

/** Shown when the Supabase keys are missing from .env.local. */
export default function SetupNeeded() {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, justifyContent: 'center', gap: 12 }}>
      <Text style={{ color: c.ink, fontSize: 24, fontWeight: '800' }}>Almost there</Text>
      <Text style={{ color: c.ink, fontSize: 16, lineHeight: 22 }}>
        Quenchie can&apos;t find your Supabase keys. Create a file called .env.local in the project folder with your
        Project URL and anon key (see the README, step 3), then restart with npx expo run:ios.
      </Text>
    </View>
  );
}
