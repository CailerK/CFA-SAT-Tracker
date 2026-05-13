# Deploying CFA-SAT-Tracker to Railway

This walks you from zero (no Railway account) to a live URL where you can log in.
Estimated time: **20–30 minutes** for the first deploy.

---

## What just got added to your repo

Before deploying, here's what changed locally so you know what's being pushed:

| File | Purpose |
|---|---|
| `.gitignore` | Keeps secrets, venv, db.sqlite3, node_modules out of git |
| `backend/requirements.txt` | Added `gunicorn`, `whitenoise`, `psycopg2-binary`, `dj-database-url` |
| `backend/myproject/settings.py` | Reads env vars; uses Postgres when `DATABASE_URL` is set; locks endpoints behind login by default |
| `backend/myproject/urls.py` | Serves the React build for any non-`/api/`, non-`/admin/` URL |
| `backend/.env.example` | Template for local env vars |
| `frontend/src/services/api.js` | Real backend calls (no more mock login) |
| `frontend/src/App.js` | Checks session with the backend instead of trusting localStorage |
| `nixpacks.toml` | Tells Railway how to build React + Django together |
| `railway.json` | Railway project config |

---

## Step 1 — Push to GitHub

Your repo isn't committed yet. From the project root:

```bash
cd ~/CFA-SAT-Tracker

# Make sure nothing sensitive sneaks in
git status

# Stage everything (.gitignore will exclude venv, db.sqlite3, node_modules, etc.)
git add .

# First commit
git commit -m "Initial commit: Django + React + Railway deploy config"

# Push to GitHub
git push -u origin main
```

If `git push` complains the remote already has commits, run `git pull --rebase origin main` first.

---

## Step 2 — Create your Railway account

1. Go to **https://railway.com** (or railway.app — same site).
2. Click **Start a New Project** → **Login with GitHub**.
3. Authorize Railway to read your repos.
4. You'll get **$5 of free trial credit** — that's enough to run this app for ~1 month while you're testing. After that it's pay-as-you-go (~$5–15/month for this stack).

---

## Step 3 — Create the project from your repo

1. Railway dashboard → **+ New Project**.
2. Pick **Deploy from GitHub repo**.
3. Select **CailerK/CFA-SAT-Tracker**.
4. Railway detects Nixpacks and starts building. **It will fail on the first try** — that's expected, we haven't added the database or env vars yet.

---

## Step 4 — Add Postgres

In the same project canvas:

1. Click **+ Create** (or **+ New**) → **Database** → **Add PostgreSQL**.
2. Railway provisions a Postgres instance and automatically exposes a `DATABASE_URL` to your other services in the same project.
3. Click on the Postgres service → **Variables** tab → confirm `DATABASE_URL` exists. You don't need to copy it; Django will read it from the environment.

---

## Step 5 — Set the Django env vars

Click your **web service** (the one built from GitHub) → **Variables** tab → **+ New Variable** for each:

| Variable | Value |
|---|---|
| `DJANGO_SECRET_KEY` | Generate one (see below) |
| `DJANGO_DEBUG` | `false` |
| `DJANGO_ALLOWED_HOSTS` | (leave empty — Railway's domain is auto-included) |

To generate a `DJANGO_SECRET_KEY`, run this locally:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Paste the output as the value.

**Important:** also click the **+ Reference** button next to Variables → pick the Postgres service → select `DATABASE_URL`. This links Postgres to your web service. (Railway sometimes does this automatically; check that `DATABASE_URL` appears in the web service's variables.)

---

## Step 6 — Generate a public URL

1. Click the web service → **Settings** tab → **Networking** section.
2. Click **Generate Domain**. You'll get something like `cfa-sat-tracker-production.up.railway.app`.
3. Railway will redeploy with this domain available as `RAILWAY_PUBLIC_DOMAIN` — Django picks it up automatically for `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS`.

---

## Step 7 — Watch the deploy

Click the web service → **Deployments** tab → click the active deployment → **View Logs**.

You should see, in order:
1. `Installing python311, nodejs_20…`
2. `pip install -r backend/requirements.txt`
3. `npm ci`
4. `npm run build` (React production build)
5. `python manage.py collectstatic`
6. `python manage.py migrate` (creates all the tables in Postgres)
7. `gunicorn myproject.wsgi:application` → service is **Active**.

If it fails, scroll up in the logs — the error is almost always a missing env var or a typo. The most common culprits:
- Forgot to set `DJANGO_SECRET_KEY` → `KeyError` on startup.
- Didn't link `DATABASE_URL` → Django falls back to SQLite, which won't persist across deploys.

---

## Step 8 — Create your first user

Once the deploy is green, you need users in the Postgres database (it starts empty).

**Option A: Run the script via Railway shell**

1. Web service → top-right menu → **Connect** or click the service → use the **CLI** tab.
2. Or install the Railway CLI locally: `npm i -g @railway/cli`, then:
   ```bash
   railway login
   railway link            # pick your project
   railway run python backend/manage.py shell < backend/create_demo_users.py
   ```

**Option B: Create a superuser interactively**

```bash
railway run python backend/manage.py createsuperuser
```

You'll be prompted for username, email, password. Then visit `https://YOUR-DOMAIN.up.railway.app/admin/` to log in and create more users through the admin UI (this is the "admin-created users" flow you asked for).

---

## Step 9 — Verify

1. Open `https://YOUR-DOMAIN.up.railway.app/` → you should see the React login page.
2. Try logging in with `demouser@gmail.com / demouser` (if you ran `create_demo_users.py`).
3. After login you should land on the dashboard. Refresh the page — you should stay logged in because the session cookie persists.
4. Log out → you should be kicked back to the login page.
5. Try to visit `https://YOUR-DOMAIN.up.railway.app/api/auth/me/` directly while logged out — it should return `403/401`. This is the "only with correct login info" guarantee.

---

## Day-to-day workflow after this

Every time you `git push origin main`, Railway auto-redeploys. That's it.

If you change models:
```bash
cd backend
python manage.py makemigrations   # generate migration files locally
git add backend/api/migrations/   # commit them
git commit -m "Add new fields"
git push                          # Railway runs `migrate` automatically on deploy
```

If you need to inspect prod data:
```bash
railway run python backend/manage.py shell    # Django shell against prod DB
railway connect Postgres                       # psql session
```

---

## Local development reminder

Locally you're still using SQLite (no `DATABASE_URL` env var = fallback). To run:

```bash
# Terminal 1 — backend
cd backend
source venv/bin/activate          # or: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
python manage.py migrate
python manage.py shell < create_demo_users.py    # seed users
python manage.py runserver

# Terminal 2 — frontend
cd frontend
npm install
npm start                          # runs on :3000, talks to Django on :8000
```

Then log in at `http://localhost:3000`.

---

## Adding new user roles (admin-managed)

You asked for multiple user types. The `User` model already has a `role` field. To add a new role:

1. Open Django admin → Users → Add user.
2. Fill in email, password, name, and set `role` to whatever string fits (`team_member`, `shift_leader`, `manager`, `director`, etc.).
3. In your views, gate features by `request.user.role`. Example:
   ```python
   if request.user.role not in {"manager", "director"}:
       return Response({"error": "Not authorized"}, status=403)
   ```

When you want this to be type-safe, change `role` to use `choices=` on the field and add a migration.
