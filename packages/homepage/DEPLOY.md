# Deploying flowprint.so to Cloudflare Pages

## Prerequisites

- Cloudflare account (free tier works)
- Access to the `ruminaider/flowprint` GitHub repo
- Namecheap account with `flowprint.so` domain

## Step 1: Connect GitHub to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create**
2. Select the **Pages** tab → **Connect to Git**
3. Authorize Cloudflare to access your GitHub account
4. Select the `ruminaider/flowprint` repository

## Step 2: Configure the build

Set these values in the build configuration:

| Setting | Value |
|---------|-------|
| **Project name** | `flowprint-homepage` (or `flowprint-so`) |
| **Production branch** | `main` |
| **Framework preset** | Next.js (Static HTML Export) |
| **Build command** | `cd packages/homepage && pnpm install --ignore-workspace && npx next build` |
| **Build output directory** | `packages/homepage/out` |
| **Root directory** | `/` (leave as default) |

Under **Environment variables**, add:

| Variable | Value |
|----------|-------|
| `NODE_VERSION` | `22` |
| `PNPM_VERSION` | `9` |

Click **Save and Deploy**. The first build will take 1-2 minutes.

## Step 3: Verify the preview deployment

After the build completes, Cloudflare gives you a `*.pages.dev` URL (e.g., `flowprint-homepage.pages.dev`). Open it and verify the site works — check all three tabs (Overview, Capabilities, Try It) and the card flip animation.

## Step 4: Add your custom domain

1. In your Cloudflare Pages project, go to **Custom domains** → **Set up a custom domain**
2. Enter `flowprint.so`
3. Cloudflare will ask you to configure DNS. You have two options:

### Option A: Use Cloudflare DNS (recommended)

Transfer DNS management to Cloudflare for the best performance (Cloudflare's CDN + edge caching):

1. In Cloudflare Dashboard → **Websites** → **Add a site** → enter `flowprint.so`
2. Select the **Free** plan
3. Cloudflare will scan existing DNS records and show you two nameservers (e.g., `anna.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
4. In **Namecheap** → Domain List → `flowprint.so` → **Nameservers** → select **Custom DNS**
5. Enter the two Cloudflare nameservers
6. Wait for propagation (usually 10 min–2 hours, can take up to 48 hours)
7. Once active, go back to your Pages project → **Custom domains** → add `flowprint.so`
8. Cloudflare will automatically create the CNAME record and provision SSL

### Option B: Keep Namecheap DNS (add CNAME only)

If you want to keep Namecheap managing DNS:

1. In **Namecheap** → Domain List → `flowprint.so` → **Advanced DNS**
2. Add a CNAME record:
   - **Host**: `@` (or blank for root)
   - **Value**: `flowprint-homepage.pages.dev` (your Pages subdomain)
   - **TTL**: Automatic
3. Note: CNAME on a root domain requires Namecheap's "CNAME flattening" or using `www` subdomain instead. If root CNAME doesn't work, add for `www` and set up a redirect from root to www.

## Step 5: Verify SSL

After DNS propagates, Cloudflare automatically provisions a free SSL certificate. Visit `https://flowprint.so` and confirm:
- The padlock icon appears
- The site loads correctly
- Security headers are present (check with browser DevTools → Network → response headers)

## Step 6: Set up auto-deploys (already done)

Cloudflare Pages automatically deploys on every push to your production branch (`main`). Preview deployments are created for other branches and PRs.

## Verifying security headers

After deployment, confirm headers are working:

```sh
curl -sI https://flowprint.so | grep -iE 'x-frame|x-content|referrer|permissions|content-security'
```

Expected output:
```
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=()
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'
```

## Build settings reference

The site is a fully static Next.js export (`output: 'export'` in `next.config.mjs`). No server-side rendering, no API routes, no Cloudflare Workers needed. Security headers are served via the `public/_headers` file which Cloudflare Pages reads at the edge.
