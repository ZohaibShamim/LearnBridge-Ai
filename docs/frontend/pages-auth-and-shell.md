# Frontend — Login, Signup, and Page Layouts

## What this is

These are the first screens a user sees before they're let into the app, plus the two "layout" wrapper files that decide what surrounds a page once it renders. A layout in Next.js (the framework this app is built with) is a piece of UI — like a sidebar or a page frame — that automatically wraps every page placed inside its folder, so you don't have to repeat that wrapping code on every single page. In this app, one layout adds the sidebar navigation you see on the dashboard, upload, and roadmap pages; the other is a "bare page, no sidebar" wrapper meant for auth screens like login and signup.

## File by file

### `frontend/app/(auth)/login/page.tsx`

This is the login page, and it implements a **two-step login**: first the user proves they know the email + password, then they have to type in a one-time code (OTP — a short numeric code sent to their email, valid for a limited time) before they're actually let in. This two-step check is a common security pattern because it means a stolen password alone isn't enough to log in.

**The two small helper components defined at the top of the file:**

- `OTPInput` — lines 23–81. This renders six individual little boxes, one per digit, instead of a single text field. Its job (`handleChange`, lines 34–46) is: only accept digits, move the user's cursor to the next box automatically as they type, and let backspace jump back to the previous box (`handleKeyDown`, lines 48–52) if the current box is empty. It also supports pasting all six digits at once (`handlePaste`, lines 54–61) — useful if the code is copied from an email.
- `OTPDialog` — lines 84–176. This is the popup (a "modal," meaning a small window that appears on top of the page and blocks interaction with everything behind it, built here on a shared `Modal` component) that shows up after the user submits their email/password. It displays: which email the code was sent to, the six `OTPInput` boxes, a countdown timer showing how long the code is valid for, a "Resend code" button, and Verify/Cancel buttons.

**The main `LoginPage` component — lines 178–436.**

State it tracks (state means a piece of data React watches, and re-renders the page whenever it changes):
- `formData` (line 182) — the email and password the user is typing. Note it's pre-filled with demo credentials for local testing.
- `showPassword` (line 186) — whether the password field shows plain text or dots, toggled by the eye icon.
- `otpDialogOpen` (line 189) — whether the OTP popup is currently visible.
- `otpCode` (line 190) — the six digits the user has typed into the OTP boxes so far.
- `timer` (line 191) — a countdown, in seconds, starting at 180 (3 minutes), for how long the OTP code stays valid.
- `sessionToken` (line 192) — a temporary token (a short-lived pass, like a claim ticket) the backend hands back after step one, which has to be sent along with the OTP in step two so the backend knows which login attempt this code belongs to.

Two `useEffect` blocks (lines 195–214) run the countdown: one ticks `timer` down by one every second while the dialog is open, and the other watches for `timer` hitting zero — when it does, it shows an "OTP expired" error message (toast), closes the dialog, and clears the OTP code and session token so the user has to start over.

**Step-by-step what happens when the user submits the form:**

1. The user fills in email + password and clicks "Sign In." This calls `handleSubmit` (lines 272–276), which stops the browser's default page-reload behavior and calls `loginMutation.mutate(formData)`.
2. `loginMutation` (lines 217–232) sends the email/password to the backend's "step 1" login endpoint. If it succeeds, the backend has emailed a 6-digit code to the user and returned a `sessionToken` — the code stores that token, opens the OTP dialog, resets the timer to 180 seconds, and clears any old OTP digits.
3. The user types the 6-digit code into the `OTPInput` boxes inside the dialog, then clicks "Verify," which calls `handleVerifyOtp` (lines 287–298). This double-checks the code is exactly 6 digits and that a session token still exists before calling `verifyOTPMutation.mutate(...)`.
4. `verifyOTPMutation` (lines 235–256) sends the OTP code + session token to the backend's "step 2" endpoint. Only on success is the user actually considered logged in.
5. If the code was resent or expired, `resendOTPMutation` (lines 259–270) and the "Resend code" button (in `OTPDialog`) let the user request a fresh code, resetting the timer.

**How errors are shown:** every mutation (`loginMutation`, `verifyOTPMutation`, `resendOTPMutation`) has an `onError` handler that reads the error message the backend sent back (or falls back to a generic message) and shows it as a "toast" — a small temporary notification banner — via `toast.error(...)`. A wrong OTP also clears the typed digits (line 254) so the user isn't left staring at a code that already failed.

**How a successful login redirects the user:** in `verifyOTPMutation`'s `onSuccess` (lines 237–249), the app saves the logged-in user's info into global state (`setUser`, from the Zustand store — Zustand is the small state-management library this app uses to share data like "who's logged in" across the whole app), closes the OTP dialog, shows a success toast, and after a half-second delay calls `router.push("/upload")` (line 247) to send the user straight to the CV upload page.

---

### `frontend/app/(auth)/signup/page.tsx`

This is the registration (sign-up) page — a single-step form, no OTP involved here (verification happens later, at login).

**Form fields** (all tracked together in one `formData` state object, lines 15–23): first name, last name, degree, institute (school/university name), email, password, and confirm password.

**State it tracks:**
- `formData` (lines 15–23) — every field's current value, all in one object.
- `showPassword` / `showConfirmPassword` (lines 24–25) — whether each password field is shown as plain text or hidden, toggled independently by their own eye icons.

**Step-by-step what happens when the user submits the form**, via `handleSubmit` (lines 50–72):

1. It stops the default page reload.
2. It checks the password and confirm-password fields match (lines 53–56) — if not, it shows an error toast and stops right there, before even contacting the backend.
3. It checks the password is at least 8 characters long (lines 57–60) — same deal, stops locally if this fails. (Both of these checks happen entirely in the browser, so the backend is never even called for an obviously-invalid submission.)
4. If both checks pass, it calls `registerMutation.mutate(...)` (lines 64–71) with all the fields except `confirmPassword` (that field only exists to catch typos — it's never actually sent to the backend).

**How errors are shown:** the two local checks above use `toast.error(...)` directly. If the backend itself rejects the request (say, the email is already taken), `registerMutation`'s `onError` (lines 43–47) reads the backend's error message and shows it the same way, via a toast.

**How a successful signup redirects the user:** `registerMutation`'s `onSuccess` (lines 34–42) shows a success toast, then after a 1.5-second delay calls `router.push("/login")` (line 40) — note this sends the user to the login page, not straight into the app, since they still need to actually log in (and go through the OTP step described above) after registering.

---

### `frontend/app/(with-sidebar)/layout.tsx`

This entire file is only 9 lines. In plain English: any page placed in a folder under `(with-sidebar)/` automatically gets wrapped in `MainLayout` (imported from `components/layout/MainLayout`, line 1), which is what actually draws the sidebar navigation on the left and checks whether the user is logged in.

This file itself does no logic — it's just a pass-through wrapper (`return <MainLayout>{children}</MainLayout>`, line 8) that hands whatever page is being shown (`children`) to `MainLayout`. The real work — drawing the sidebar and redirecting logged-out users back to `/login` — happens inside `MainLayout` and the `useAuthProvider` hook it uses, not in this layout file directly. In plain English, the practical effect is: every page that lives inside this route group (dashboard, upload, roadmap pages, quizzes, settings, etc.) automatically gets the sidebar, and automatically gets bounced to the login page if the visitor isn't actually signed in.

### `frontend/app/(without-sidebar)/layout.tsx`

This file is even shorter — it just returns `children` directly (line 6), meaning it wraps a page in... nothing. No sidebar, no extra markup, no auth check. It's meant to be the "bare page" layout for screens like login and signup that shouldn't show the app's sidebar.

Honestly, though: in this project, this layout currently isn't used by anything. The login and signup pages actually live in a different folder, `(auth)/`, which sits as a sibling to this one rather than nested inside it — so `(without-sidebar)/layout.tsx` has no pages routed through it at all right now. It's effectively dead code, kept around as a placeholder for a route grouping that was never finished.
