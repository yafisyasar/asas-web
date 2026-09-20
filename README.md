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