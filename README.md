# ASAS · Archive of 2024 BCA (Honours)

A browsable, searchable, file-library website for the semester-wise college archive, with a
password-protected admin panel for uploading, renaming and deleting files and folders.

Built with **Next.js 16** (App Router) + **Tailwind CSS**, deployed on **Vercel** — and the
**GitHub repo is the database**. No Vercel Blob, no other storage, no database.

## Features

- **Browse** — semester → subject → file, with breadcrumbs, per-folder search and sorting.
- **Search** — full-text search across every file in the archive, filterable by file type.
- **Preview** — PDFs, images, videos, audio and text/code files render inline, with download.
- **Admin** (`/admin`) — single-password login, upload files **or whole folders** (structure kept),
  drag-and-drop, rename/delete files and delete whole folders.
- **Latest commits** — the home page shows what was last committed to the repo.

## How it works

- The archive **is** the GitHub repo (default `yafisyasar/asas`, branch `main`). Files are served
  straight from `raw.githubusercontent.com`, so there are no storage or download limits.
- The site caches the repo's file tree server-side for 5 minutes (one GitHub API call, refreshed
  instantly after admin edits) — folders are just path prefixes like `sem 3/DS/notes.pdf`.
- Admin edits are committed to `main` via the GitHub Git Data API: uploads land as **one commit
  per batch**, renames and deletes as their own commits.
- **Vercel Functions cap request bodies at 4.5MB**, and GitHub blocks browser-direct writes, so web
  uploads are limited to files under ~4.5MB. **Larger files are added with git** and appear
  automatically. (The largest file in the archive is ~51MB; pushing it once is trivial.)

## Stack

| Layer    | Tech                                       |
| -------- | ------------------------------------------ |
| Frontend | Next.js 16, React 19, Tailwind CSS v4      |
| Backend  | Next.js Route Handlers / Server Components |
| Storage  | GitHub repo (via git data API + raw CDN)   |
| Auth     | Shared admin password + HMAC-signed cookie |

## Getting started

### 1. Install & run locally

```bash
npm install
cp .env.local.example .env.local
# fill in the values (see "Environment variables" below)
npm run dev
```

Open http://localhost:3000.

### 2. Environment variables

Create a **fine-grained personal access token** at https://github.com/settings/tokens → *Generate
new token (preview)* for the archive repo only, with:

- **Contents → Contents**: *Read and write*
- **Metadata → Metadata**: *Read* (set automatically for fine-grained tokens)

Then set:

```dotenv
GITHUB_OWNER=yafisyasar
GITHUB_REPO=asas
GITHUB_BRANCH=main
GITHUB_TOKEN=github_pat_xxxxxxxx
ADMIN_PASSWORD=your-strong-admin-password
# Optional: separate secret for the session cookie (falls back to ADMIN_PASSWORD)
ADMIN_SESSION_SECRET=long-random-string
```

The token powers both the cached file listing (avoids the 60 req/hr anonymous limit) and all admin
edits, which are committed to `main` as the token's account.

## Admin usage

1. Open `/admin`, sign in with `ADMIN_PASSWORD`.
2. **Upload** tab: type a destination folder (e.g. `sem 3/DS`), drag files in or pick a whole
   folder, then upload. Each batch becomes one commit on `main`.
3. **Manage files** tab: search, rename (✏️) or delete (🗑) individual files, or delete a whole
   folder via the folder row button.
4. Files over ~4.5MB can't pass through a Vercel function — push them to the repo with git:

```bash
git add "sem 4/python/project.zip"
git commit -m "Add project.zip"
git push
```

They show up on the site within a minute (or instantly after clicking around since the cache
refreshes).

## Deploying to Vercel

1. Push this project to a GitHub repo.
2. In Vercel: **Add New → Project**, import the repo (framework: Next.js). No Blob store needed.
3. Add the environment variables in **Project → Settings → Environment Variables**:
   `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `GITHUB_TOKEN`, `ADMIN_PASSWORD`,
   `ADMIN_SESSION_SECRET`.
4. Deploy (or it's automatic on push). Visit `/admin` to manage content.

## Project layout

```
app/
  page.tsx                      # home (stats, semesters, latest commits)
  browse/[[...path]]/page.tsx   # folder browser
  search/page.tsx               # global search
  about/page.tsx                # about page
  admin/page.tsx                # admin dashboard (upload + manage)
  admin/login/page.tsx          # admin login
  api/blobs/route.ts            # public file index (cached tree)
  api/raw/route.ts              # text/code preview proxy
  api/admin/<login|logout|upload|delete|rename|revalidate>/route.ts
lib/
  github.ts                     # cached tree read + git commit/delete/rename helpers
  auth.ts                       # password + signed session cookie
  paths.ts                      # path/tree utilities, icon helpers
  types.ts                      # shared types
components/                     # UI components
proxy.ts                        # admin route guard
```

## Scripts

```bash
npm run dev     # local dev server
npm run build   # production build
npm run start   # production server
npm run lint    # eslint
```