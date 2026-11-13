# Quenchie

A water tracker for iPhone. Log what you drink, see how much is left for the day,
get a recommended goal from your age and sex, link up with friends to see each
other's progress, and (optionally) add a Home Screen widget with tap-to-log buttons.

Built with Expo (React Native) and Supabase.

---

## What you need

- A Mac with **Xcode** (from the App Store) and **Node.js** (LTS, from nodejs.org)
- An iPhone on iOS 17 or later, and its cable
- A free **Supabase** account (supabase.com)
- An **Apple ID**. Free works for the app. The widget needs the paid Apple Developer Program ($99/year), see step 6.

---

## 1. Set up the database (Supabase, about 5 minutes)

1. Go to supabase.com, sign in, and create a project called `quenchie`. Pick any password and region.
2. When it's ready, open **SQL Editor** in the left sidebar, then **New query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) in this repo, copy all of it, paste it in, and press **Run**.
   You should see "Success. No rows returned."
4. Optional, but makes sign-up instant: go to **Authentication → Sign In / Providers → Email** and turn **off** "Confirm email".
   If you leave it on, new accounts must tap a link in their email before signing in.
5. Go to **Project Settings → API Keys** (or **Data API**). You'll need two things for step 3:
   - the **Project URL** (looks like `https://abcd1234.supabase.co`)
   - the **anon / publishable key** (a long string; *not* the secret or service_role key)

## 2. Get the code onto your Mac

Open the **Terminal** app and run these one at a time:

```bash
git clone https://github.com/davidlee0712/Quenchy.git
```

```bash
cd Quenchy
```

```bash
npm install
```

## 3. Add your Supabase keys

In the same Terminal window, run:

```bash
open -e .env.local 2>/dev/null || (touch .env.local && open -e .env.local)
```

TextEdit opens an empty file. Paste this, replace the two values with yours from step 1.5, and save:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-OR-PUBLISHABLE-KEY
```

`.env.local` is ignored by git, so your keys never get pushed to GitHub.

## 4. Sign Xcode in with your Apple ID (first time only)

1. Open **Xcode → Settings → Accounts**, press **+**, choose **Apple ID**, and sign in.
2. Plug your iPhone into the Mac, unlock it, and tap **Trust** if asked.

## 5. Install Quenchie on your iPhone

```bash
npx expo run:ios --device
```

Pick your iPhone from the list. The first build takes several minutes. If it asks to install CocoaPods, say yes.

**If the build stops with a signing error** ("Signing for Quenchie requires a development team"):

1. Run `open ios/Quenchie.xcworkspace`
2. In Xcode, click **Quenchie** at the top of the left sidebar, then the **Quenchie** target, then **Signing & Capabilities**.
3. Tick **Automatically manage signing** and choose your **Team** (your name, "Personal Team").
4. If it says the bundle identifier isn't available, add `QUENCHIE_BUNDLE_ID=com.yourname.quenchie` to `.env.local`, then run `npx expo prebuild --clean` and step 5 again.
5. Run `npx expo run:ios --device` again.

**On the iPhone, the first time:**

- If it says "Developer Mode required": **Settings → Privacy & Security → Developer Mode → On**, then restart.
- If it says "Untrusted Developer": **Settings → General → VPN & Device Management**, tap your Apple ID, then **Trust**.

With a free Apple ID the app stops opening after **7 days**. Plug the phone in and run step 5 again to renew it. Your data is safe in Supabase.

## 6. Turn on the Home Screen widget (paid Apple account)

The widget and the app share data through an "App Group", which Apple only allows on paid developer accounts.

1. Join the Apple Developer Program and find your **Team ID** at developer.apple.com → Account → Membership.
2. Add these lines to `.env.local`:
   ```
   QUENCHIE_WIDGET=1
   APPLE_TEAM_ID=YOURTEAMID
   ```
3. Rebuild:
   ```bash
   npx expo prebuild --clean
   ```
   ```bash
   npx expo run:ios --device
   ```
4. Open Quenchie once. Then long-press your Home Screen, tap **Edit → Add Widget**, search for **Quenchie**, and pick a size.
   - **Small:** ring, amount left, and **+ Glass / + Bottle** buttons
   - **Medium:** the same, plus your friends' progress
   - **Lock Screen:** a ring, a progress bar, or a one-line "x ml left"

Drinks you tap on the widget show up on the widget straight away and are saved to your diary the next time the app opens.

---

## Linking with a friend

Your friend needs Quenchie on their phone too.

- **Free account:** plug their iPhone into your Mac and run step 5 with their phone selected. Same 7-day rule.
- **Paid account:** share it through TestFlight instead (no cable, lasts 90 days).

Then in the app: **Friends** tab → share your 6-letter code → they type it in and tap **Add**. You're linked both ways and appear on each other's Home screen. Turn off **Share my progress** any time to hide your drinks.

## What's in the app

| Tab | What it does |
| --- | --- |
| **Home** | Ring with amount remaining, your recommended goal, friends today, quick-add buttons, streak, 7-day average, week chart |
| **Diary** | Goal − Drank = Remaining, drinks grouped into Morning / Afternoon / Evening, browse past days |
| **Progress** | 7- or 30-day chart against your goal, average, days at goal, best day, top drink |
| **Friends** | Your friend code, add friends, sharing switch, each friend's day, streak and week |
| **+ button** | Search drinks, All / Recent / Frequent / My drinks, serving size × servings, custom drinks |
| **Settings** (gear) | Age, sex, daily activity, workouts, climate, so you get a recommended daily amount; goal, bottle size, ml or fl oz, saved drinks, reminders, sign out |

The recommended amount follows the US National Academies' guidance for water from drinks
(about 2.2 L for women and 3.0 L for men aged 19 and over, less for children, more in pregnancy and breastfeeding),
plus 250 ml for a day on your feet (lots of walking) or 750 ml for physical work, about 350 ml per 30 minutes of sweaty exercise, and 500 ml for a hot climate. It's a general guideline, not medical advice.

## For developers

```bash
npx tsc --noEmit
```

```bash
npx eslint src app.config.ts
```

- Screens live in `src/app` (Expo Router), shared state in `src/lib/store.tsx`, the widget in `src/widgets/quenchie-widget.tsx`.
- The function marked `'widget'` is copied into the widget as source text, so it can't use variables or helpers defined outside it.
- `ios/` is generated. Change native settings in `app.config.ts`, then run `npx expo prebuild --clean`.
