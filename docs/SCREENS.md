# Screens

19 screens in `src/screens/`, grouped by feature. Each file starts with a comment that says what it shows
and which API it uses.

## Signed-out (`screens/auth`)

| Screen | File | Data | Main parts | Goes to |
|---|---|---|---|---|
| Welcome | `WelcomeScreen.js` | `program.about` | Orbit graphic, headline, Create account / Log in | Register, Login, Explore |
| Explore | `ExploreScreen.js` | `getProgram`, `getIllustrativeSchedule` | Package ticket, **illustrative calculator chart**, how-it-works carousel, income grid, level bars, withdrawal stats, reward banner, FAQ accordion, legal | Reward |
| Travel reward | `RewardScreen.js` | `getProgram`, `getPackages` (if signed in) | Route graphic, progress to 400,000 USDT, 3 steps, terms | Buy package / Register |
| Log in | `LoginScreen.js` | `AuthContext.signIn` | Underline fields, show/hide password, keep-signed-in | Dashboard (auto) |
| Create account | `RegisterScreen.js` | `AuthContext.signUp` | Filled fields, country chips, password strength, referral code, terms | Dashboard (auto) |

## Home & packages

| Screen | File | Data | Charts / parts |
|---|---|---|---|
| Dashboard (Home tab) | `home/DashboardScreen.js` | `getDashboard`, `getBalanceSeries` | Balance hero, 4 quick actions, KPIs, **BalanceChart** (7D/30D/90D/All), **DonutChart** income split, active package progress, **SimpleBarChart** team by level, referral strip, recent transactions, **CashFlowChart** |
| Notifications | `home/NotificationsScreen.js` | `getNotifications`, `markAllNotificationsRead` | All/Unread filter, unread dots |
| Buy package | `packages/BuyPackageScreen.js` | `getPlans`, `quotePackage`, `buyPackage` | Plan medallion, big amount input, presets, live quote, balance warning, confirm dialog |
| My packages | `packages/MyPackagesScreen.js` | `getPackages`, `getPackageSchedule` | Next-payout clock, 3 stat cards, **ScheduleChart** (posted vs scheduled – tap a package to switch), All/Active/Completed list with progress |
| Earnings | `packages/EarningsScreen.js` | `getEarnings` | Total, **ProgressRing** ×3 by source, **StackedBarChart** 30 days, Daily/Direct/Level history |

## Wallet

| Screen | File | Data | Parts |
|---|---|---|---|
| Wallet (tab) | `wallet/WalletScreen.js` | `getWallet`, `getStatement` | Balance card, 4 action tiles, last-30-days flow, statement with filters |
| Deposit | `wallet/DepositScreen.js` | `getDepositInfo`, `verifyDeposit` | **Real QR code** of the address, copy, 3 steps, Verify, sweeps note, deposits list |
| Transfer | `wallet/TransferScreen.js` | `getTransfers`, `sendTransfer` | Receiver field, **number keypad**, 25/50/75/Max, note, summary, month totals, history |
| Withdraw | `wallet/WithdrawScreen.js` | `getWithdrawals`, `quoteWithdrawal`, `requestWithdrawal` | Available/Locked, amount + quick buttons, BEP20 address (saved address shortcut), **receipt-style quote**, tappable 4-step guide, requests list |

## Team & account

| Screen | File | Data | Parts |
|---|---|---|---|
| Team (tab) | `team/TeamScreen.js` | `getTeam` | **Orbit map** (rings = levels, dots = members), counts, Direct / Levels / Tree views |
| Commission levels | `team/LevelsScreen.js` | `getLevels` | **SegmentGauge** 2/5, “1 more unlocks Level 3”, level ladder, explainer |
| Referral | `team/ReferralScreen.js` | `getReferral` | Gold hero, coupon code + link, native Share sheet, 6 stats, steps timeline, network bars, recent directs |
| Support | `account/SupportScreen.js` | `getSupportTickets`, `createTicket` | All/Open/Closed, ticket cards with last reply, composer pinned at bottom |
| Profile (tab) | `account/ProfileScreen.js` | `getProfile`, `updateProfile`, `AuthContext.signOut` | Avatar + badges, IDs & balances, editable details (Save appears when changed), security, links, Log out |

## Shared building blocks

| Component | Use |
|---|---|
| `Screen` | Safe area + scroll + pull-to-refresh + optional pinned `footer`; `withTabBar` adds bottom space |
| `Header` | Back arrow + title + right slot |
| `Button` | `primary` / `secondary` / `outline` / `ghost` / `danger`, sizes `lg` `md` `sm`, `loading` |
| `Card` | Surface; tones `default` / `gold` / `outlineGold` / `dashed`; `onPress` makes it tappable |
| `Section` | Title + subtitle + action link |
| `Segmented` | Tabs/filters: `box`, `pill`, `underline` |
| `Field` | Labelled input, `filled` / `underline`, `secure` with eye toggle, `hint` / `error` |
| `TransactionRow` | One ledger entry (icon & colour by type) |
| `Badge`, `Avatar`, `IconCircle`, `Row`, `ListItem`, `EmptyState`, `Loading`, `ErrorView`, `Notice` | Small pieces in `Misc.js` |
| `Icon` | SVG line icons – add new ones in `components/Icon.js` |

## Adding a new screen (checklist)

1. Create `src/screens/<feature>/MyNewScreen.js` using `<Screen>` + `<Header>`.
2. Add any data function to `src/services/api.js` (and static data to `src/data/` if needed).
3. Load it with `const { data } = useApi(api.getSomething)`.
4. Add a route name to `src/navigation/routes.js` and a `<Stack.Screen>` in `RootNavigator.js`.
5. Navigate with `navigation.navigate(ROUTES.MY_NEW)`.
6. Add it to `__tests__/screens.test.js` so it’s render-tested.

## Things that are simulated (wire up later)

| Feature | Now | To make it real |
|---|---|---|
| Copy buttons | Show “Copied” | `@react-native-clipboard/clipboard` → `Clipboard.setString()` |
| Attach screenshot | Info alert | `react-native-image-picker` |
| Buy / transfer / withdraw | Validate + success alert | Real endpoints in `api.js` |
| Session | Lost on restart | Store token with AsyncStorage/Keychain |
