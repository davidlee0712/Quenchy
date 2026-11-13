import type { ConfigContext, ExpoConfig } from 'expo/config';

// Turn the Home Screen widget on with QUENCHIE_WIDGET=1 in .env.local.
// The widget shares data with the app through an App Group, which needs a paid
// Apple Developer account. With a free account, leave it off.
const widgetEnabled = process.env.QUENCHIE_WIDGET === '1';

// Must be unique on Apple's side. Change it in .env.local if Xcode says it's taken.
const bundleIdentifier = process.env.QUENCHIE_BUNDLE_ID || 'io.github.davidlee0712.quenchie';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Quenchie',
  slug: 'quenchie',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'quenchie',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier,
    deploymentTarget: '17.0',
    supportsTablet: false,
    ...(process.env.APPLE_TEAM_ID ? { appleTeamId: process.env.APPLE_TEAM_ID } : {}),
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: bundleIdentifier,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { backgroundColor: '#0e5f86', image: './assets/images/splash-icon.png', imageWidth: 76 },
    ],
    // Reminders are scheduled on the phone, so no push notification setup is needed.
    ['expo-notifications', { enableRemoteNotifications: false }],
    ...(widgetEnabled
      ? [
          [
            'expo-widgets',
            {
              widgets: [
                {
                  name: 'Quenchie',
                  displayName: 'Quenchie',
                  description: "Today's water, quick-log buttons and your friends.",
                  ios: {
                    // Lets the widget draw before the app has been opened.
                    initialLayout: './src/widgets/quenchie-widget.tsx',
                    supportedFamilies: [
                      'systemSmall',
                      'systemMedium',
                      'accessoryCircular',
                      'accessoryRectangular',
                      'accessoryInline',
                    ],
                  },
                },
              ],
            },
          ] as [string, unknown],
        ]
      : []),
  ],
  experiments: { typedRoutes: false, reactCompiler: true },
  extra: { ...config.extra, widgetEnabled },
});
