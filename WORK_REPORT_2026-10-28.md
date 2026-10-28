# Work Report — 28 Oct 2026

**Project:** Finitygrowth (mobile) ↔ stravex_mlm_web (web parity)  
**Focus:** Authentication flow (all auth screens), Dashboard charts, Profile, Change password, Identity verification (KYC), camera/gallery stability

---

## 1. Authentication flow (web AuthPage parity)

Work covered the full authentication stack and shared pieces, aligned with the web `AuthPage` / OTP / reset deep-link flow.

### Screens

| Screen | Work |
|--------|------|
| **Welcome** | Brand hero, CTAs → Create account / Sign in / Explore packages; aurora background. |
| **Explore** | Browse packages while signed out. |
| **Login** | User id + password via **`AuthField`**; client validation (`validateLogin`); API → session **or** OTP challenge; `usePreventRemove` so Back leaves OTP first. |
| **Register** | Full signup (name, email, mobile, country **`AuthSelect`**, password rules, confirm, debounced sponsor lookup, terms/risk); OTP challenge as on web; session / success handoff. |
| **Forgot password** | Email via **`AuthField`** + `validateForgot`; send reset; optional “I have a reset code” → Reset. |
| **Reset password** | Token (paste URL/code) + new / confirm password; `extractResetToken`; deep-link prefill; success → Login with note. |

### Shared auth building blocks

- **`AuthField`** — underline input (Login look), secure show/hide; used on Login / Register / Forgot / Reset (and later Change password).
- **`AuthSelect`** — underline dropdown (country, etc.) with sheet picker.
- **`OtpStep`** — mirrors web OtpStep: 6-digit auto-submit, countdown, resend wait, incorrect / expired / rate-limit handling; keyboard-aware actions.
- **`authValidation.js`** — `validateLogin` / `validateSignup` / `validateForgot` / `validateReset` + `passwordRules` (same copy and rules as web).

### Session, API & navigation

- **Auth APIs:** `login`, `verifyLogin`, `signup`, `verifySignup`, `resendOtp`, `lookupSponsor`, `forgotPassword`, `resetPassword`.
- **`authStore` + `persistStorage`** — persist token/user (Zustand); hydrate-safe boot if native storage is missing until rebuild.
- **Deep linking (`linking.js` + AndroidManifest):**  
  `finitygrowth://reset-password?token=…`  
  `https://…/#/reset-password?token=…` (web email style)  
  + helpers for forgot / login / register paths.
- **RootNavigator** — signed-out stack: Welcome → Explore, Reward, Login, Register, Forgot, Reset; signed-in MainTabs + account stacks.

**Key files:**  
`src/screens/auth/*`, `src/components/AuthField.js`, `AuthSelect.js`, `OtpStep.js`, `src/utils/authValidation.js`, `src/services/api.js` (auth section), `src/store/authStore.js`, `persistStorage.js`, `src/navigation/RootNavigator.js`, `linking.js`, `routes.js`, Android intent-filters for reset links.

---

## 2. Dashboard & charts (web parity)

Aligned mobile dashboard/charts with web (`Dashboard.jsx` / LWC-style behaviour):

- **Balance chart** — X-axis ticks closer to web LWC (All / 90D ranges).
- **Income legend** — amounts aligned (e.g. `0.00 USDT`).
- **Donut / packages** — empty-state spinner/ring like web; Active packages presentation matched.
- **Team by level** — same structure/data presentation as web.
- **Cash flow** — placed before Recent transactions; Y-axis fixed to clean integer steps (`0 / 1 / 2`), no duplicate/reversed empty ticks.

**Key files:**  
`src/screens/home/DashboardScreen.js`, `src/components/charts/BalanceChart.js`, `DonutChart.js`, cash-flow / bar chart components.

---

## 3. Profile screen (web Account parity)

Rebuilt **Profile** to follow web `Account.jsx`:

- Live **GET / PATCH** `/api/v1/me/profile` (fields + optional `profileImage` multipart).
- Hero with avatar, KYC chip, tiles, personal form, security links, account meta.
- **Profile photo:** Camera / Gallery via bottom sheet modal (not system Alert).
- Blur backdrop on iOS; dim overlay on Android.
- Navigation to Change password & Identity verification.

**Key files:**  
`src/screens/account/ProfileScreen.js`, `src/services/api.js` (`getProfile` / `updateProfile`), `src/services/http.js` (`imageUrl`, FormData).

**Native deps:** `react-native-image-picker`, `@react-native-community/blur` (Android rebuild + iOS pods).

---

## 4. Camera / Gallery crash fixes

Issues when opening camera or gallery (Profile + KYC):

| Cause | Fix |
|--------|-----|
| Declaring `CAMERA` in AndroidManifest without a proper grant path | Removed `CAMERA` from the manifest; rely on the system camera intent (image-picker docs). |
| Opening the picker while the modal is still dismissing | Close the sheet first, then open the picker after a short delay. |
| `InteractionManager` removed in **RN 0.88** | Crash: *Invariant Violation: InteractionManager has been removed…* — replaced with `setTimeout` only in Profile + KYC. |

**Key files:**  
`android/app/src/main/AndroidManifest.xml`, `ProfileScreen.js`, `KycScreen.js`.

Android debug build rebuilt and installed successfully after native module link.

---

## 5. Change password

`ChangePasswordScreen` updated to match web `More.jsx` → `Password`:

- Same API: **POST** `/api/v1/me/password/change` (`currentPassword`, `newPassword`, `confirmPassword`).
- Same success copy: *Password changed. A confirmation email was sent.*
- Inputs switched to shared **`AuthField`** (underline + show/hide), same as Login / Reset.

**Key file:** `src/screens/account/ChangePasswordScreen.js`

---

## 6. Identity verification (KYC)

Full web parity for `More.jsx` → `Kyc` on mobile:

- **GET** `/api/v1/me/verification` — status badge, `kycNote`, submitted document preview.
- When not locked (`submitted` / `approved`):  
  - **Document type** — `AuthSelect` (Passport / National ID / Driving license).  
  - **Document image** — Camera / Gallery sheet.  
  - **Submit** — multipart POST.
- New API helper: `submitVerification({ documentType, file })` → **POST** `/api/v1/me/verification` (`documentType` + `documentImage`).

**Key files:**  
`src/screens/account/KycScreen.js`, `src/services/api.js` (`getVerification`, `submitVerification`).

---

## 7. Deliverables summary

| Area | Status |
|------|--------|
| Auth: Welcome / Explore | Done |
| Auth: Login + OTP | Done |
| Auth: Register + sponsor + OTP | Done |
| Auth: Forgot / Reset + deep links | Done |
| Auth shared: AuthField, AuthSelect, OtpStep, validation | Done |
| Auth session persist + navigator | Done |
| Dashboard charts vs web | Done |
| Profile live API + photo upload UI | Done |
| Android rebuild (image-picker / blur) | Done |
| Camera/gallery InteractionManager crash | Fixed |
| Change password + AuthField | Done |
| KYC submit + fields like web | Done |

---

## 8. Suggested QA checklist

### Authentication
- [ ] Welcome → Create account / Sign in / Explore navigation.
- [ ] Login: validation, wrong credentials, OTP verify / resend / expire / back from OTP.
- [ ] Register: all fields, country select, sponsor lookup valid/invalid, terms/risk, OTP, session.
- [ ] Forgot: valid email send; “I have a reset code”.
- [ ] Reset: paste token or full web URL; password rules; confirm match; deep link opens with token.
- [ ] Session persists after app kill; sign-out clears the auth stack.

### Product (post-login)
- [ ] Dashboard: All / 90D X ticks, income legend, empty donut, team levels, cash-flow Y (`0/1/2`), section order.
- [ ] Profile: load/save fields, Camera + Gallery photo, Save with image, blur/sheet UX.
- [ ] Change password: API validation errors, success message, show/hide password.
- [ ] KYC: status/note/document preview; pick image; submit; lock when submitted/approved.
- [ ] Confirm Camera/Gallery no longer crash after InteractionManager removal (Profile + KYC).

---

*Report for work completed on 28 October 2026.*
