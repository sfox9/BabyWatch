# BabyWatch

Family care, beautifully coordinated. Parents post childcare shifts on a shared calendar; grandparents, aunts, uncles, and nannies claim them.

The app works in two modes, automatically:

1. **Right away (no setup):** data is saved on each person's device and never resets on refresh — good for trying it out.
2. **Family sync mode (recommended):** after the free 10-minute Supabase setup below, everyone sees the same calendar live, and email notifications can be turned on.

---

## Part 1 — Put the app online (Vercel, ~5 minutes, free)

1. Go to **github.com** → Sign Up (any email works).
2. Click the **+** button (top right) → **New repository** → name it `babywatch` → **Create repository**.
3. On the next page click **uploading an existing file**, drag the entire contents of this folder in, and click **Commit changes**.
4. Go to **vercel.com** → Sign Up → **Continue with GitHub**.
5. Click **Add New… → Project** → find `babywatch` → **Import** → **Deploy**.
6. After about a minute you get a link like `babywatch-xyz.vercel.app`. That's your app.

---

## Part 2 — Turn on family syncing (Supabase, ~10 minutes, free)

Supabase is a free online database. This step makes the calendar shared, so everyone in the family sees the same shifts instantly.

1. Go to **supabase.com** → **Start your project** → sign up (you can use GitHub).
2. Click **New project**. Name: `babywatch`. Set any database password (write it down somewhere — you won't need it day-to-day). Click **Create new project** and wait ~2 minutes.
3. In the left sidebar, click **SQL Editor** → **New query**.
4. Open the file `supabase/schema.sql` from this folder, copy ALL of it, paste it into the editor, and click **Run**. You should see "Success".
5. In the left sidebar, click the gear (**Project Settings**) → **API**. You'll see two things you need:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (a long string)
6. Go back to **vercel.com** → your `babywatch` project → **Settings** → **Environment Variables**. Add these two, then click Save:
   - Name: `VITE_SUPABASE_URL` — Value: the Project URL
   - Name: `VITE_SUPABASE_ANON_KEY` — Value: the anon public key
7. Go to the **Deployments** tab → click the three dots on the newest deployment → **Redeploy**.

Done. The app is now fully shared. Everyone's accounts, shifts, children, and notifications live in your database.

---

## Part 3 — Turn on email notifications (Resend, ~10 minutes, free, optional)

The in-app notification bell already works. This adds real emails when a shift is posted or claimed.

1. Go to **resend.com** → Sign Up (free plan is plenty).
2. In Resend: **API Keys** → **Create API Key** → copy it.
3. In Supabase: left sidebar → **Edge Functions** → **Deploy a new function** (choose the in-browser editor option).
   - Name it exactly: `send-email`
   - Delete the example code and paste in everything from `supabase/functions/send-email/index.ts` (in this folder)
   - Click **Deploy**.
4. Still in Edge Functions, open **Secrets** (or Project Settings → Edge Functions → Secrets) and add:
   - Name: `RESEND_API_KEY` — Value: the key you copied from Resend.

Note: on Resend's free plan without a custom domain, emails come from `onboarding@resend.dev` and can only be delivered to the email address you signed up to Resend with. To email the whole family, verify a domain in Resend (Domains → Add Domain), then add a second Supabase secret `BABYWATCH_FROM` like `BabyWatch <hello@yourdomain.com>`.

---

## How the family uses it

- **First parent:** open the app link → Create Account → choose **Parent**, leave the invite code blank. This creates your family and gives it a random invite code (shown in **Settings**).
- **Everyone else (second parent, family members, nannies):** use the invite link a parent shares from **Settings** (it opens straight to Create Account with the code filled in), or choose Create Account and enter the family code shown in Settings. Pick **Parent** if they should also have full admin access (e.g. a second parent), or **Family Member / Nanny** for view/claim access.
- Add your children in **Settings**, then tap any day on the calendar to post a shift.
- **Phone home screen:** open the link on a phone → Share button (iPhone) or menu (Android) → **Add to Home Screen**. It looks and feels like an installed app.
- **Skylight / Apple / Google Calendar:** tap **Export iCal** under the calendar and open the downloaded file.

---

## For the technically curious

- React + Vite. All data access goes through one module (`src/lib/store.js`), so the app can later be wrapped with Capacitor or Expo for the App Store / Play Store without a rewrite.
- With no Supabase keys set, the store falls back to on-device persistence (localStorage) — nothing ever resets on refresh.
- Passwords are stored as SHA-256 hashes, not plain text. This is a lightweight, family-scale auth — fine for a private family app, not for sensitive data.
- Local development: `npm install`, copy `.env.example` to `.env` (optional), `npm run dev`.

## Making changes later

Edit any file in GitHub (open the file → pencil icon). Vercel automatically redeploys in about 30 seconds; the link stays the same.
