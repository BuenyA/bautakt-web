# bautakt-web

Monorepo with two initialized applications:

- **Marketing website**: Next.js app in `/home/runner/work/bautakt-web/bautakt-web/apps/marketing`
- **Bautakt web app**: React (Vite) app in `/home/runner/work/bautakt-web/bautakt-web/apps/web` with an authentication mode (sign-in/sign-up toggle)

## Local development

From repository root (`/home/runner/work/bautakt-web/bautakt-web`):

```bash
npm install
npm run dev:marketing
npm run dev:web
```

## Build

```bash
npm run build:marketing
npm run build:web
```

## Vercel deployment + bautakt.com

1. Create a Vercel project for `apps/marketing` and deploy it.
2. In Vercel project settings, add custom domain `bautakt.com`.
3. Update DNS records with your domain provider as requested by Vercel.
4. (Optional) Create a separate Vercel project for `apps/web` (for example, on `app.bautakt.com`).
