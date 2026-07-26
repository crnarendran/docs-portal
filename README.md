# docs-portal

Shared documentation portal for the `sanjeev-ai`, `swarmkit`, and `keystar`
repos. Each of those repos syncs its own `docs/` content into this app's
Firestore backend (`portal_docs`/`portal_docs_dev` collections, tagged by
`project`); this app is the sole thing that renders and serves it, with
Firebase Auth + `portal_users` RBAC gating access per project.

Split out from `sanjeev-ai` into its own repo on 2026-07-26 — it was
previously a subfolder there. See `sanjeev-ai`'s
`docs/ops/infrastructure-map.md` for the full multi-repo Firebase project
map and the split's rationale.

## Branches & deploys

Mirrors `sanjeev-ai`'s promotion flow for consistency across repos:

- **`dev`** — integration branch. Nothing auto-deploys on push; use it for
  local development and as the base for feature branches.
- **`staging`** — pushing here triggers `deploy-staging.yml`, which builds
  the app and deploys Hosting + Firestore rules + Functions to the
  `docs-portal-staging` Firebase project.
- **`main`** — pushing here triggers `deploy-prod.yml`, deploying to
  `docs-portal-prod`. This is the repo's default/production branch (named
  `main`, not `prod`, matching `sanjeev-ai`'s own convention).

Promote by merging/pushing `dev` → `staging` → `main`, same as the other
repos in this ecosystem.

## About this Next.js app

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
