# Deployment Guide

Flowprint App is a static single-page application (SPA) built with Vite and React. After building, the output in `packages/app/dist/` can be served from any static hosting provider.

## Prerequisites

All deployment methods require a production build. The monorepo uses pnpm workspaces, and the app depends on two sibling packages (`schema` and `editor`) that must be built first.

**Build command** (from the repository root):

```bash
pnpm --filter @ruminaider/flowprint-schema build \
  && pnpm --filter @ruminaider/flowprint-editor build \
  && pnpm --filter flowprint-app build
```

The output is written to `packages/app/dist/`.

## Configuration

The code-search URL is configured at runtime through the in-app Settings dialog (stored in the browser's IndexedDB). There are no build-time environment variables required.

---

## Docker

The included multi-stage Dockerfile builds the monorepo in a `node:22-alpine` stage and copies the static output into an `nginx:alpine` image.

### Build the image

```bash
docker build -f packages/app/Dockerfile -t flowprint-app .
```

Run this from the **repository root** -- the build context needs the full monorepo.

### Run the container

```bash
docker run -p 8080:80 flowprint-app
```

Open `http://localhost:8080` in a browser.

### Custom nginx configuration

The default `packages/app/nginx.conf` handles SPA routing (all non-file requests fall through to `index.html`), static asset caching, and basic security headers. To override it, bind-mount your own config:

```bash
docker run -p 8080:80 \
  -v $(pwd)/my-nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  flowprint-app
```

---

## Vercel

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel
```

When prompted (or via `vercel.json`):

| Setting          | Value                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Root directory   | `.` (repo root)                                                                                                                             |
| Build command    | `pnpm --filter @ruminaider/flowprint-schema build && pnpm --filter @ruminaider/flowprint-editor build && pnpm --filter flowprint-app build` |
| Output directory | `packages/app/dist`                                                                                                                         |
| Install command  | `pnpm install`                                                                                                                              |

### Option B: vercel.json

Create `vercel.json` at the repository root:

```json
{
  "buildCommand": "pnpm --filter @ruminaider/flowprint-schema build && pnpm --filter @ruminaider/flowprint-editor build && pnpm --filter flowprint-app build",
  "outputDirectory": "packages/app/dist",
  "installCommand": "pnpm install",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Then deploy:

```bash
vercel --prod
```

---

## Cloudflare Pages

### Via the Cloudflare dashboard

1. Connect the GitHub repository in the Cloudflare Pages dashboard.
2. Configure the build settings:

| Setting          | Value                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework preset | None                                                                                                                                        |
| Build command    | `pnpm --filter @ruminaider/flowprint-schema build && pnpm --filter @ruminaider/flowprint-editor build && pnpm --filter flowprint-app build` |
| Build output     | `packages/app/dist`                                                                                                                         |
| Root directory   | `/` (repo root)                                                                                                                             |
| Node.js version  | `22`                                                                                                                                        |

3. Cloudflare Pages automatically handles SPA routing (serves `index.html` for missing paths) when no `_redirects` file is present.

### Via Wrangler CLI

```bash
npm i -g wrangler

# Build locally
pnpm --filter @ruminaider/flowprint-schema build \
  && pnpm --filter @ruminaider/flowprint-editor build \
  && pnpm --filter flowprint-app build

# Deploy
wrangler pages deploy packages/app/dist --project-name flowprint-app
```

---

## AWS S3 + CloudFront

### 1. Build

```bash
pnpm --filter @ruminaider/flowprint-schema build \
  && pnpm --filter @ruminaider/flowprint-editor build \
  && pnpm --filter flowprint-app build
```

### 2. Create an S3 bucket

```bash
aws s3 mb s3://flowprint-app --region us-east-1
```

### 3. Upload the build output

```bash
aws s3 sync packages/app/dist/ s3://flowprint-app/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

aws s3 cp packages/app/dist/index.html s3://flowprint-app/index.html \
  --cache-control "no-cache"
```

Note: `index.html` is uploaded separately with `no-cache` so that deployments take effect immediately. All other assets (JS, CSS, images) use content-hashed filenames and can be cached indefinitely.

### 4. Create a CloudFront distribution

```bash
aws cloudfront create-distribution \
  --origin-domain-name flowprint-app.s3.amazonaws.com \
  --default-root-object index.html
```

### 5. Configure SPA error handling

In the CloudFront distribution settings, add custom error responses:

| HTTP Error Code | Response Page Path | HTTP Response Code |
| --------------- | ------------------ | ------------------ |
| 403             | `/index.html`      | 200                |
| 404             | `/index.html`      | 200                |

This routes all unmatched paths to `index.html` for client-side routing.

Via the CLI:

```bash
aws cloudfront update-distribution \
  --id <DISTRIBUTION_ID> \
  --custom-error-responses '{
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/index.html",
        "ResponseCode": "200",
        "ErrorCachingMinTTL": 0
      }
    ]
  }'
```

### 6. Invalidate cache after deploy

```bash
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

---

## GCP Cloud Storage + Load Balancer

### 1. Build

```bash
pnpm --filter @ruminaider/flowprint-schema build \
  && pnpm --filter @ruminaider/flowprint-editor build \
  && pnpm --filter flowprint-app build
```

### 2. Create a GCS bucket

```bash
gsutil mb -l us-central1 gs://flowprint-app
gsutil web set -m index.html -e index.html gs://flowprint-app
gsutil iam ch allUsers:objectViewer gs://flowprint-app
```

The `-e index.html` flag sets the error page to `index.html`, which handles SPA routing for direct URL access.

### 3. Upload the build output

```bash
gsutil -m rsync -r -d packages/app/dist/ gs://flowprint-app/

# Set cache headers for hashed assets
gsutil -m setmeta \
  -h "Cache-Control:public, max-age=31536000, immutable" \
  gs://flowprint-app/assets/**

# Ensure index.html is not cached
gsutil setmeta \
  -h "Cache-Control:no-cache" \
  gs://flowprint-app/index.html
```

### 4. Set up a load balancer (optional, for custom domain + HTTPS)

```bash
# Create a backend bucket
gcloud compute backend-buckets create flowprint-backend \
  --gcs-bucket-name=flowprint-app \
  --enable-cdn

# Create a URL map with SPA routing
gcloud compute url-maps create flowprint-url-map \
  --default-backend-bucket=flowprint-backend

# Create HTTPS proxy and forwarding rule
gcloud compute target-https-proxies create flowprint-https-proxy \
  --url-map=flowprint-url-map \
  --ssl-certificates=<CERTIFICATE_NAME>

gcloud compute forwarding-rules create flowprint-forwarding-rule \
  --target-https-proxy=flowprint-https-proxy \
  --ports=443 \
  --global
```

---

## GitHub Pages

For projects hosted on GitHub, you can deploy to GitHub Pages via a workflow.

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: |
          pnpm --filter @ruminaider/flowprint-schema build
          pnpm --filter @ruminaider/flowprint-editor build
          pnpm --filter flowprint-app build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: packages/app/dist

      - id: deployment
        uses: actions/deploy-pages@v4
```

Note: If the app is deployed to a subpath (e.g., `https://user.github.io/flowprint/`), set `base` in `packages/app/vite.config.ts`:

```ts
export default defineConfig({
  base: '/flowprint/',
  // ...
})
```
