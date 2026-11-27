# VANAIVU

Premium women's fashion e-commerce with a 3D Virtual Studio, AI photo try-on and an AI stylist.
A single full-stack Next.js 16 app (App Router, server actions, route handlers) with Prisma.

## Run it

```bash
npm install
npm run db:setup     # creates the SQLite database and seeds the catalogue
npm run dev          # http://localhost:3000
```

Seeded accounts (`admin@vestra.test`, `demo@vestra.test`) get the passwords from `SEED_ADMIN_PASSWORD` / `SEED_DEMO_PASSWORD`, or the defaults in `prisma/seed.ts`. Re-run `npm run db:seed` to reset all data.

## Environment (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file locally. For PostgreSQL change `provider` in `prisma/schema.prisma` to `postgresql`, point this at your database and run `npx prisma migrate dev`. |
| `AUTH_SECRET` | Signs session cookies. **Set a long random value in every deployed environment.** |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay (test or live). Without them, development uses a clearly labelled local test-payment provider; production refuses to start checkout. |
| `ANTHROPIC_API_KEY` | Enables the AI stylist (Claude `claude-opus-5-5`, tool use over the live catalogue, server-side refusal fallback). Without it, a labelled rule-based recommender answers. |
| `TRYON_API_KEY` (+ optional `TRYON_PROVIDER=fashn`, `TRYON_MODEL`, `TRYON_API_URL`) | Enables AI photo try-on through the FASHN API. Without it the page says try-on isn't configured; no mock images are ever shown. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Shows "Continue with Google" (redirect URI: `<origin>/api/auth/google/callback`). |

## What's where

- `prisma/schema.prisma`: normalised model (users, profiles, measurements, avatars, catalogue with variant-level inventory, 3D assets, garment configs, collections, carts, orders, payments, shipments, returns, refunds, try-on sessions/results, stylist conversations).
- `src/lib`: server logic (`catalog`, `cart` pricing/coupons/shipping/stock validation, `orders`, `payments` provider interface, `ai/stylist`, `ai/tryon` provider interface, `fit` size suggestions).
- `src/app/actions`: server actions (cart, checkout, auth, account, wishlist, studio, admin, stylist).
- `src/components/studio/engine`: the 3D avatar engine (Three.js / React Three Fiber).
- `src/app/admin`: dashboard, products (variants, inventory, images, GLB upload), collections, orders (fulfilment, refunds, returns), customers, content.

## Virtual Studio: how fitting works

The avatar is a real 3D mesh generated from the customer's measurements (height, bust, waist, hip, shoulders) and body type. Garments are generated around that body from each product's `GarmentConfiguration` (slot, silhouette, length, fabric) and the selected size's garment measurements, so a smaller size visibly tightens and the Fit panel reports ease per region. The swaying hems are a procedural drape animation, **not** a physical cloth simulation, and the UI says so.

The provider interface also supports rigged GLB/GLTF bodies, and admins can upload GLB garment assets with a skeleton tag. The Studio checks that tag for compatibility before loading a garment. No rigged GLB avatar ships with the repo.

## Realistic avatar (Virtual Studio)

The default avatar is a realistic woman built on the **CC0 MakeHuman** base mesh: 63 shape targets (weight, muscle, height, bust, cup, waist, hips, tummy, glutes, shoulders, arms, thighs, leg length, facial heritage mix, head shape, nose, lips, eyes), real skin textures tinted to any tone, fitted hair (8 styles), brows, lashes and 9 eye colours, plus the MakeHuman skeleton for poses (relaxed, hand on hip, poised, animated runway walk). Garments are cut from her morphed body surface, smoothed like fabric and offset by the selected size's ease; a neutral base layer is worn wherever nothing else covers her. Live tape measurements and "Match my measurements" reshape her to the customer's numbers.

Assets in `public/avatar` are generated (already committed output; rebuild only to change them):

```bash
python -I scripts/avatar/fetch_sources.py <dir-a>        # base mesh, targets, skeleton (GitHub, CC0)
# download makehuman_system_assets_cc0.zip from files.makehumancommunity.org and extract skins/, hair/, eyebrows/, eyelashes/, eyes/materials/ to <dir-b>
python -I scripts/avatar/build_assets.py <dir-a> <dir-b> public/avatar
```

## Known limits / next steps

- Background work (try-on polling) is request-driven; a queue worker (e.g. BullMQ + Redis) is the production upgrade.
- Emails (order confirmation, password reset, stock alerts) are not sent yet; in development the reset link is shown on screen.
- Photo try-on and Razorpay code follow the providers' documented APIs but have not been exercised here without real credentials.
- Uploaded files are stored on local disk (`storage/`, `public/uploads/`); swap for S3/Supabase before deploying to serverless hosts.
