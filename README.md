# Finitygrowth – React Native app

Mobile app for the Finitygrowth member program (packages, wallet, earnings, team & referrals).
Built with **React Native CLI + JavaScript**. All data is **static** for now and comes through a
small mock API layer, so a real backend can be plugged in later without touching the screens.

| | |
|---|---|
| React Native | 0.88 (New Architecture on) |
| Language | JavaScript |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| Charts | react-native-gifted-charts (+ react-native-svg, react-native-linear-gradient) |
| QR code | react-native-qrcode-svg |
| Fonts | Inter, Plus Jakarta Sans, Instrument Serif (linked in `assets/fonts`) |

---

## 1. Requirements

- **Node.js 22.11+** and npm
- **Android:** Android Studio, Android SDK, an emulator or a USB-connected phone (JDK 17)
- **iOS (Mac only):** Xcode, CocoaPods (`sudo gem install cocoapods` or via Bundler)

Follow the official guide once to set up your machine:
https://reactnative.dev/docs/set-up-your-environment

## 2. Install & run

```bash
cd Finitygrowth
npm install

# iOS only (first time and whenever native packages change)
bundle install          # installs the CocoaPods version from the Gemfile
cd ios && bundle exec pod install && cd ..

# Start Metro (JS bundler) in one terminal
npm start

# In another terminal
npm run android         # or
npm run ios
```

**Log in with anything.** The login is simulated: any Login ID + any password signs you in
(the Login ID is pre-filled with `STX100000`).

## 3. Useful commands

| Command | What it does |
|---|---|
| `npm start` | Starts Metro bundler |
| `npm run android` / `npm run ios` | Builds and launches the app |
| `npm test` | Runs Jest: data checks + renders all 19 screens |
| `npm run lint` | ESLint |
| `npx react-native-asset` | Re-links fonts after adding/removing a file in `assets/fonts` |
| `npm start -- --reset-cache` | Clears Metro cache (fixes most “module not found” issues) |

## 4. Project structure

```
Finitygrowth/
├── App.js                    # Root: SafeAreaProvider → AuthProvider → RootNavigator
├── index.js                  # Registers App with React Native
├── assets/fonts/             # .ttf files (named by PostScript name)
├── react-native.config.js    # Tells the CLI where fonts are
├── src/
│   ├── theme/                # Colors, fonts, spacing, radius, text presets
│   ├── data/                 # STATIC data (program rules, user, packages, team, ledger…)
│   ├── services/api.js       # Mock API – the only place screens get data from
│   ├── hooks/useApi.js       # Loading / error / refresh for any api function
│   ├── context/AuthContext.js# Signed-in state (fake login)
│   ├── navigation/           # Stack + tabs, custom floating tab bar, route names
│   ├── components/           # Reusable UI (Screen, Header, Button, Card, Field…)
│   │   └── charts/           # Chart components (line, donut, bars, rings, gauge)
│   ├── screens/              # 19 screens grouped by feature
│   └── utils/                # date + number formatting
├── __tests__/                # Jest tests
└── docs/                     # How everything is connected (start here!)
```

## 5. Documentation

| Doc | Read it to… |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Understand how the layers connect (data → api → hook → screen) and app start-up |
| [docs/DATA-LAYER.md](docs/DATA-LAYER.md) | See the static data, every API function, and how to switch to a real backend |
| [docs/SCREENS.md](docs/SCREENS.md) | Find each screen: what it shows, which API it calls, where it navigates |
| [docs/CHARTS.md](docs/CHARTS.md) | Learn each chart component, its data shape, and how to add a new chart |
| [docs/NAVIGATION.md](docs/NAVIGATION.md) | See the navigation tree and how to add a screen |

## 6. Static data notes

- “Today” is frozen to **27 Oct 2026** (`src/utils/date.js → TODAY`) so charts look the same on every device.
- Actions (buy, transfer, withdraw, verify deposit) **validate input and show results**, but don’t change
  the static numbers. New support tickets and “mark all read” are kept in memory until the app restarts.
- Names, emails, IDs and wallet addresses are placeholders.
