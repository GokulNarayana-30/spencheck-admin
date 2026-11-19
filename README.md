# Spencheck admin panel

A single static page (`index.html`) for publishing Home banners and popups,
forcing an update, reviewing reports, and seeing user counts. It talks to
Supabase directly with the **publishable** key — that key is public by
design. Every admin action goes through `admin_*` database functions that
check the signed-in account is in `public.admins`
(`supabase/migrations/20261119030000_admin_panel.sql`), so the page
grants nothing to anyone else. Never put the secret / service_role key here.

## One-time setup

1. Supabase dashboard → **Authentication → Users → Add user → Create new
   user**: your admin email and a strong password. Tick "Auto confirm".
   (This is a Supabase account, separate from app sign-in via Firebase.)
2. Supabase dashboard → **SQL editor**, run (with your email):

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

3. Open the panel. Locally: `cd admin && python3 -m http.server 8080`, then
   http://localhost:8080. To host it, any static host works (Netlify,
   Vercel, Cloudflare Pages, GitHub Pages) — there is no build step.
   Add the host's URL under **Authentication → URL Configuration** if
   Supabase asks for it.

## What each part does in the app

| Panel | App |
|---|---|
| Banners & popups → Home card | Card on Home under the shortcuts (DASH-057); user can close it |
| Banners & popups → Popup when the app opens | Dialog on app start; once per user / once a day / every open |
| Banners & popups → System popup | Same, but shown first; "Blocking" makes it full-screen and impossible to dismiss (maintenance) |
| Only below app version | Reaches only builds with a lower version code (`versionCode` in pubspec's `+N`) |
| App config → Force update | Builds below the minimum version code get a full-screen "Update required" gate |
| Messages | Chat as the verified **Spencheck** account: message one @username or everyone (each gets a push), see replies with unread counts, answer them. "Users can reply" off turns it into a read-only announcements channel (the database enforces it) |
| Reports | What users reported from chat/friends. "Remove user" deletes their social profile, friends and messages — not their Firebase account or on-phone money data |

Changes reach phones on their next app start. Signed-out users don't see
banners or popups.
