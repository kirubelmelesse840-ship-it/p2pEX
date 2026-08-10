# 🚀 P2PEX Deployment Guide

This guide covers 3 deployment options, from easiest to most advanced.

---

## ✅ Option 1: Vercel + Supabase (RECOMMENDED — Free & Easy)

Vercel is the creator of Next.js — it's the best place to host Next.js apps.
Supabase provides a free PostgreSQL database in the cloud.

### Step 1: Create a Supabase database (free)

1. Go to **https://supabase.com** → Sign up with GitHub
2. Click **New Project**
3. Fill in:
   - **Name**: `p2pex-db`
   - **Database Password**: pick a strong password, **save it!**
   - **Region**: closest to your users
4. Wait ~2 min for the database to be created
5. Go to **Settings → Database → Connection string → URI**
6. Copy the connection string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
   Replace `[YOUR-PASSWORD]` with the password you saved.

### Step 2: Push your code to GitHub

```bash
# In your project folder
git init
git add .
git commit -m "Initial commit - P2PEX exchange"
git branch -M main

# Create a repo on GitHub first (https://github.com/new), name it "p2pex"
git remote add origin https://github.com/YOUR_USERNAME/p2pex.git
git push -u origin main
```

### Step 3: Deploy on Vercel

1. Go to **https://vercel.com** → Sign up with GitHub
2. Click **Add New → Project**
3. Import your `p2pex` repo
4. Vercel auto-detects Next.js — keep the default settings
5. Expand **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres` |
   | `VAPID_PUBLIC_KEY` | `BN2er8ElDeG4fnznLkMCUmAWjE6v9Z-UYGd4LhZglraEJ6AYIpZ0oAinf8m7fVKDSIwnxt3KeuQjNAfJqzVGUbU` |
   | `VAPID_PRIVATE_KEY` | `5rZ0JxRh4WZ-JfqBDkxEeA2xz4MvknylJsEdej95AWA` |
   | `VAPID_SUBJECT` | `mailto:support@p2pex.com` |

6. Click **Deploy** — wait ~3 min
7. Your site is live at `https://p2pex-xxx.vercel.app` 🎉

### Step 4: Initialize the database

After the first deploy, the database is empty. Run the seed script:

```bash
# On your local machine, set DATABASE_URL to your Supabase URL first:
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Then push the schema and seed:
npx prisma db push
npx prisma generate
node scripts/full-reset.ts
```

### Step 5: Generate VAPID keys (optional — for push notifications)

The keys above already work, but if you want your own:

```bash
npx web-push generate-vapid-keys
```

Update the `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` env vars on Vercel.

---

## ✅ Option 2: Railway (All-in-one — Database + App)

Railway hosts both the database and the app in one place.

### Steps:

1. Go to **https://railway.app** → Sign up with GitHub
2. **New Project → Deploy from GitHub repo** (push your code to GitHub first, see Step 2 above)
3. Add a PostgreSQL database: **New → Database → Add PostgreSQL**
4. Railway gives you a `DATABASE_URL` — copy it
5. Go to your app's **Variables** tab and add:
   - `DATABASE_URL` = (the value Railway gave you)
   - `VAPID_PUBLIC_KEY` = `BN2er8ElDeG4fnznLkMCUmAWjE6v9Z-UYGd4LhZglraEJ6AYIpZ0oAinf8m7fVKDSIwnxt3KeuQjNAfJqzVGUbU`
   - `VAPID_PRIVATE_KEY` = `5rZ0JxRh4WZ-JfqBDkxEeA2xz4MvknylJsEdej95AWA`
   - `VAPID_SUBJECT` = `mailto:support@p2pex.com`
6. Set the **Build Command** to: `npm install && npx prisma generate && npm run build`
7. Set the **Start Command** to: `npx next start`
8. Deploy — Railway gives you a URL like `https://p2pex.up.railway.app`

---

## ✅ Option 3: VPS (DigitalOcean / Hetzner / AWS EC2)

For full control — you rent a server and run everything yourself.

### Steps:

1. **Rent a VPS** (e.g. DigitalOcean $6/mo droplet, Ubuntu 22.04)
2. **SSH in** and install Node.js + PostgreSQL:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql nginx git

# Install PM2 (process manager — keeps your app running)
sudo npm install -g pm2
```

3. **Set up PostgreSQL:**

```bash
sudo -u postgres psql
# In the psql prompt:
CREATE DATABASE p2pex;
CREATE USER p2pex_user WITH ENCRYPTED PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE p2pex TO p2pex_user;
\q
```

4. **Clone your code & install:**

```bash
git clone https://github.com/YOUR_USERNAME/p2pex.git
cd p2pex
npm install
npx prisma generate
```

5. **Create `.env` file:**

```bash
cat > .env << EOF
DATABASE_URL=postgresql://p2pex_user:your_strong_password@localhost:5432/p2pex
VAPID_PUBLIC_KEY=BN2er8ElDeG4fnznLkMCUmAWjE6v9Z-UYGd4LhZglraEJ6AYIpZ0oAinf8m7fVKDSIwnxt3KeuQjNAfJqzVGUbU
VAPID_PRIVATE_KEY=5rZ0JxRh4WZ-JfqBDkxEeA2xz4MvknylJsEdej95AWA
VAPID_SUBJECT=mailto:support@p2pex.com
EOF
```

6. **Build & start with PM2:**

```bash
npx prisma db push
npm run build
pm2 start "npx next start -p 3000" --name p2pex
pm2 save
pm2 startup  # follow the instructions it prints
```

7. **Set up Nginx reverse proxy + SSL:**

```bash
sudo nano /etc/nginx/sites-available/p2pex
```

Paste:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then:

```bash
sudo ln -s /etc/nginx/sites-available/p2pex /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Free SSL certificate with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🗄️ Database Migration: SQLite → PostgreSQL

Your project currently uses SQLite. For any cloud host, you need PostgreSQL.

### Change the Prisma datasource:

In `prisma/schema.prisma`, change:

```prisma
datasource db {
  provider = "postgresql"   // ← was "sqlite"
  url      = env("DATABASE_URL")
}
```

Then regenerate:

```bash
npx prisma generate
npx prisma db push   # creates all tables in the new PostgreSQL database
```

### SQLite → PostgreSQL data type notes

- SQLite uses `String` for everything; PostgreSQL has proper types
- Prisma handles this automatically — your schema stays the same
- The `Json` type works in both, but PostgreSQL handles it natively

---

## 🔧 Production Checklist

Before going live, make sure to:

- [ ] Change `DATABASE_URL` to your cloud database (not `file:...`)
- [ ] Generate your own VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Set `NODE_ENV=production`
- [ ] Run `npx prisma db push` to create tables in the new database
- [ ] Run your seed script to create the admin user + P2P listings
- [ ] Test the live site: sign up, login, trade, P2P, wallet
- [ ] Set up a custom domain (Vercel: Settings → Domains; Railway: Settings → Networking)
- [ ] Enable HTTPS (automatic on Vercel/Railway; use Let's Encrypt on VPS)

---

## 🆓 Free Tier Comparison

| Host | Free tier | Database | Best for |
|------|-----------|----------|----------|
| **Vercel + Supabase** | ✅ Both free | PostgreSQL free (500MB) | **Recommended** — easiest, best Next.js support |
| **Railway** | $5 trial credit | PostgreSQL included | All-in-one simplicity |
| **Render** | ✅ Free web service | PostgreSQL free (90 days) | Alternative to Vercel |
| **DigitalOcean** | $6/mo | Self-hosted | Full control, custom domain |

---

## 🎯 My Recommendation

**Go with Vercel + Supabase** — it's free, the easiest, and the best for Next.js:

1. Supabase gives you a free PostgreSQL database
2. Vercel gives you free Next.js hosting with automatic HTTPS
3. Your site gets a free `*.vercel.app` URL (or add a custom domain)
4. Push notifications, P2P, wallet — everything works out of the box

**Steps to deploy in under 10 minutes:**

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "P2PEX"
# Create repo on github.com, then:
git remote add origin https://github.com/YOU/p2pex.git
git push -u origin main

# 2. Go to vercel.com → Import your repo → Add env vars → Deploy

# 3. Create Supabase database → Copy DATABASE_URL → Add to Vercel env vars

# 4. Run prisma db push + seed locally with the Supabase URL

# Done! 🎉
```

---

## ❓ Need Help?

If you hit any issues during deployment, tell me:
- Which option you chose (Vercel / Railway / VPS)
- The exact error message
- Where the error happened (build time / runtime / database)

I'll help you fix it.
