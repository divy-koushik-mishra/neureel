# Neureel — Web app

Next.js 16 app that takes user uploads, ships them to Cloudflare R2, triggers
TRIBE v2 inference on Modal, and renders the results — virality score, 3D
brain surface with per-vertex activation, Destrieux region breakdown, and a
POC "Playground" (temporal dynamics, peak moments, raw `.npy` download).

Part of the [`neureel`](../../README.md) monorepo. Paired with
[`../../ml/`](../../ml/README.md) (the Modal GPU service) and
[`../../docs/atlas.md`](../../docs/atlas.md) (brain mesh bake pipeline).

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js **16** (App Router, React 19.2, Turbopack dev) |
| API layer | tRPC v11 (`@trpc/tanstack-react-query`) |
| Auth | BetterAuth 1.6 with Google OAuth |
| ORM | Prisma 7 (custom generated client path `src/generated/prisma/`) |
| DB | Neon Postgres (pooled for runtime, direct for migrations) |
| Object storage | Cloudflare R2 (S3 API via `@aws-sdk/client-s3`) |
| Styling | Tailwind CSS **v4** (no config file; `@theme inline` in `globals.css`) |
| 3D brain viewer | React Three Fiber + `three` + hand-baked fsaverage5 mesh |
| Lint/format | Biome |
| Package manager | pnpm (workspace) |

Next.js 16 specifics that shape the code:
- Route `params`, `cookies()`, `headers()` all return Promises — awaited everywhere.
- `middleware.ts` is renamed to `proxy.ts` (see [`src/proxy.ts`](src/proxy.ts)).
- `allowedDevOrigins` in [`next.config.ts`](next.config.ts) enables dev-over-tunnel scenarios.

---

## Directory tour

```
apps/web/
├── prisma/
│   ├── schema.prisma          User, Session, Account, Verification, Job, JobStatus
│   └── migrations/            4 applied migrations
├── public/atlas/
│   ├── fsaverage5.bin         Packed mesh: 2× hemispheres, inflated+pial verts,
│   │                          Destrieux per-vertex label, sulc depth
│   └── fsaverage5.meta.json   Binary layout + 76 Destrieux label names
├── scripts/
│   └── r2-cors.ts             pnpm tsx helper that PUTs a CORS policy on the R2 bucket
└── src/
    ├── app/
    │   ├── page.tsx                            Landing
    │   ├── layout.tsx                          Root layout
    │   ├── globals.css                         Tailwind v4 theme + dark palette
    │   ├── (auth)/sign-in/page.tsx             Google sign-in (server component)
    │   ├── api/
    │   │   ├── auth/[...all]/route.ts          BetterAuth handler
    │   │   ├── auth-start/google/route.ts      Server-side OAuth start (no JS needed)
    │   │   ├── trpc/[trpc]/route.ts            tRPC fetch handler
    │   │   └── webhook/inference/route.ts      Modal → Neureel webhook
    │   └── dashboard/
    │       ├── layout.tsx                      Auth gate + header
    │       ├── page.tsx / DashboardClient.tsx  Upload + job list
    │       ├── UserMenu.tsx                    Sign-out dropdown
    │       └── results/[jobId]/
    │           ├── page.tsx                    Async params
    │           └── ResultsClient.tsx           Polls job, renders score/viewer/playground
    ├── components/
    │   ├── BrainMesh.tsx                       R3F mesh viewer (see § 3D viewer)
    │   ├── BrainViewer.tsx                     Picks 3D or SVG fallback
    │   ├── BrainViewerFallback.tsx             2D SVG schematic (no-WebGL path)
    │   ├── BrainRegionsTable.tsx               6-region virality breakdown
    │   ├── Playground.tsx                      Timeline + heatmap + drilldown + raw data
    │   ├── Recommendations.tsx                 Derived from top-activated regions
    │   ├── ViralityScoreCard.tsx               Big number + bucket label
    │   ├── UploadZone.tsx                      Drag-drop + XHR PUT to R2
    │   ├── JobCard.tsx / JobStatusBadge.tsx
    │   └── ui/                                 button, card, badge, progress, skeleton, table, input
    ├── lib/
    │   ├── auth.ts                             BetterAuth config (google provider)
    │   ├── auth-client.ts                      authClient + hooks
    │   ├── prisma.ts                           Prisma singleton + PrismaPg adapter
    │   ├── r2.ts                               Presigned PUT/GET helpers
    │   ├── modal.ts                            Fetches Modal /inference with auth
    │   ├── scoring.ts                          VIRALITY_WEIGHTS, getViralityLabel, deriveRecommendations
    │   └── utils.ts                            cn() helper
    ├── trpc/
    │   ├── init.ts                             createTRPCContext + protectedProcedure
    │   ├── client.tsx / server.tsx / query-client.ts
    │   └── routers/
    │       ├── _app.ts
    │       └── jobs.ts                         create / triggerInference / getById / list
    └── proxy.ts                                Auth gate redirect (Next 16)
```

---

## How it flows

```
1. Browser: sign in via /api/auth-start/google
   (plain server redirect — no client JS needed for OAuth start)

2. Dashboard: drag a file into UploadZone
   ├─ tRPC jobs.create      → row in Postgres (status PENDING) + R2 presigned PUT
   ├─ XHR PUT to R2          → file lands in bucket (progress bar)
   └─ tRPC jobs.triggerInference
       ├─ signs an R2 GET URL for the file
       ├─ status → PROCESSING
       └─ POST ${MODAL_API_URL}/inference with x-webhook-secret
            body: {job_id, file_url, file_type, webhook_url}

3. Modal: runs TRIBE v2 (see ml/README.md), POSTs back to webhook_url.

4. /api/webhook/inference
   ├─ verifies x-webhook-secret
   ├─ updates Job: status, viralityScore, brainRegions, activationMap, note
   └─ stuffs timeseries / destrieux_full / peak_moments / raw_npy_url / metadata
      into Job.rawOutput (Json) — one catch-all blob for the Playground UI.

5. ResultsClient polls jobs.getById every 5 s until status ∈ {COMPLETED, FAILED}.
   On COMPLETED: ViralityScoreCard + BrainMesh + BrainRegionsTable +
                 Recommendations + Playground.
```

---

## The brain viewer ([`src/components/BrainMesh.tsx`](src/components/BrainMesh.tsx))

- **Mesh**: fsaverage5 cortical surface, same space TRIBE v2 predicts on.
  Baked once by [`../../ml/scripts/bake_mesh.py`](../../ml/scripts/bake_mesh.py)
  into a compact binary under `public/atlas/`. 20,484 vertices, 40,960 faces
  per surface; `activationMap[i]` maps 1-to-1 to vertex `i`.
- **Two surfaces**: inflated (smoother, easier to read regions) and pial
  (real folding). Toggle in the viewer. Both share vertex ordering + face
  topology, so the activation overlay works identically on either.
- **Sulc shading**: baked per-vertex from FreeSurfer sulcal depth. Gyri
  rendered light, sulci dark; the activation colormap blends on top above a
  user-controlled threshold so the anatomy reads through low-activation areas.
- **View presets**: lateral / medial / dorsal — hemispheres rotate in place
  (camera is fixed) so each view shows the canonical face.
- **Hover tooltip**: raycast against the mesh, look up Destrieux label index
  per vertex → region name, activation value, hemisphere.
- **Destrieux parcellation** packed with the mesh: 76 cortical labels, used
  both for hover and for the Playground's "Full Destrieux breakdown" table.

Binary asset layout in [`public/atlas/fsaverage5.bin`](public/atlas/) (offsets
in `fsaverage5.meta.json`): `{lh,rh}_{v_infl,v_pial,f,sulc,labels}`. ~1 MB total.

---

## The Playground ([`src/components/Playground.tsx`](src/components/Playground.tsx))

POC-mode section at the bottom of the results page showing everything TRIBE
hands back, not just the 6 tracked regions:

- **Whole-brain activation timeline** — SVG line chart of mean activation per
  timestep. Shows where in the video the biggest engagement peak happens.
- **Region × time heatmap** — 6 tracked regions × N timesteps, row-normalized
  CSS grid. Reveals *which* region fires *when*.
- **Peak moments** — top 5 timesteps by whole-brain mean, each annotated with
  the three regions that dominated.
- **Full Destrieux breakdown** — collapsible table of all ~148 (label × hemi)
  rows, sortable.
- **Raw data**
  - Download raw `.npy` (7-day presigned R2 URL to the full `(T, V)` float32
    tensor — plug into a notebook)
  - Collapsible pretty-printed JSON of the whole `rawOutput` blob with
    copy-to-clipboard.

No chart libs — all SVG/CSS.

---

## Data model ([`prisma/schema.prisma`](prisma/schema.prisma))

BetterAuth tables (`user`, `session`, `account`, `verification`) are standard.
The one app-specific table:

```prisma
enum JobStatus { PENDING PROCESSING COMPLETED FAILED }

model Job {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  status        JobStatus @default(PENDING)
  inputType     String         // "video" | "image"
  fileName      String
  r2Key         String
  r2Url         String?
  activationMap Json?          // 20,484 floats (mean over time)
  brainRegions  Json?          // 6 tracked regions with {name, activation, function}
  viralityScore Float?
  note          String?        // demo-mode Easter-egg / informational banner
  errorMessage  String?
  rawOutput     Json?          // catch-all: timeseries, destrieux_full, peak_moments, raw_npy_url, metadata
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  completedAt   DateTime?
}
```

State transitions: strictly `PENDING → PROCESSING → COMPLETED | FAILED`.
Never skipped, never reversed.

---

## Environment variables

`.env.example` documents every var. Prod values live on Vercel.

| Var | What | Dev | Prod |
|---|---|---|---|
| `DATABASE_URL` | Postgres URL | `postgresql://dev:dev@localhost:5432/neureel` | Neon **pooled** URL + `?sslmode=require&pgbouncer=true&connect_timeout=10` |
| `BETTER_AUTH_SECRET` | HMAC secret | `openssl rand -base64 32` (local) | fresh value on Vercel |
| `BETTER_AUTH_URL` | BetterAuth's canonical base | `http://localhost:3000` | `https://neureel.vercel.app` |
| `GOOGLE_CLIENT_ID` / `_SECRET` | OAuth creds | same | same |
| `NEXT_PUBLIC_APP_URL` | What the browser hits | `http://localhost:3000` | `https://neureel.vercel.app` |
| `WEBHOOK_BASE_URL` | Public URL Modal POSTs back to | ngrok tunnel (Modal can't reach localhost) | `https://neureel.vercel.app` |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | Cloudflare R2 creds | same | same |
| `MODAL_API_URL` | Deployed Modal FastAPI | `https://<user>--neureel-ml-fastapi-app.modal.run` | same |
| `MODAL_WEBHOOK_SECRET` | Shared secret with Modal | `openssl rand -base64 32` | same value must be in Modal secret `neureel-secrets` under `WEBHOOK_SECRET` |

**Why `NEXT_PUBLIC_APP_URL` is separate from `WEBHOOK_BASE_URL`:** in dev, the
browser runs on plain `localhost:3000` (no ngrok browser warnings, no
hydration weirdness), while Modal's webhook still goes through a tunnel since
it can't reach `localhost` directly. In prod they're the same value.

---

## Local dev

**Prereqs:** Node 20+, pnpm, Docker (for local Postgres) or a Neon dev branch,
a running `ml/` Modal deploy for the inference path, an ngrok quick tunnel
(optional — only needed to receive webhook callbacks from Modal).

```bash
# 0. Install deps
pnpm install

# 1. Bring up Postgres
docker run -d --name neureel-pg \
  -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=neureel \
  -p 5432:5432 postgres:alpine

# 2. Apply migrations
pnpm db:migrate

# 3. Fill in .env (see apps/web/.env.example for the full list)

# 4. (Optional) start an ngrok tunnel so Modal can deliver webhooks
ngrok http --url=<your-reserved-domain>.ngrok-free.dev 3000
# Put the tunnel URL into WEBHOOK_BASE_URL and extend R2 CORS:
pnpm tsx scripts/r2-cors.ts http://localhost:3000 https://<your-ngrok>.ngrok-free.dev

# 5. Run the app
pnpm dev
```

Open `http://localhost:3000` — sign in with Google, drop a short MP4. Watch
Modal's dashboard logs for the GPU work.

Useful scripts:

```
pnpm dev                  # Next dev server (Turbopack)
pnpm build                # Full prod build (incl. prisma generate + ts check)
pnpm lint                 # Biome check
pnpm format               # Biome format --write
pnpm db:migrate           # prisma migrate dev
pnpm db:push              # prisma db push (no migration file)
pnpm db:studio            # prisma studio
pnpm db:generate          # regenerate client → src/generated/prisma/
pnpm tsx scripts/r2-cors.ts <origin> [origin...]   # refresh R2 CORS policy
```

---

## Deployment (Vercel)

Repo is connected to Vercel with root directory `apps/web`.

**First time setup:**
1. `vercel login` and `vercel link` inside `apps/web`.
2. Set every var from the env table above (prod column).
3. Run migrations against Neon (see below).
4. Add the prod URL to:
   - Google OAuth → Authorized JS origins + Authorized redirect URIs (`/api/auth/callback/google`)
   - R2 CORS → `pnpm tsx scripts/r2-cors.ts <all origins including prod>`

**Prisma migrations on Neon** — use the **direct** endpoint (not the pooled
`-pooler` one; Prisma's migrate engine needs durable connections):

```bash
DATABASE_URL='postgresql://USER:PASS@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require' \
  pnpm prisma migrate deploy
```

Runtime uses the **pooled** URL with `?pgbouncer=true&connect_timeout=10` so
Vercel serverless doesn't exhaust Neon's connection limit.

**Subsequent deploys:** push to `main`. Vercel auto-builds. ML changes deploy
independently via [`.github/workflows/deploy-ml.yml`](../../.github/workflows/deploy-ml.yml).
