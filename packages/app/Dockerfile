# Stage 1: Build the monorepo
FROM node:22-alpine AS build

RUN corepack enable

WORKDIR /app

# Copy lockfile and workspace config first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./

# Copy package.json files for each workspace package
# All packages must be present for pnpm install to resolve the workspace
COPY packages/schema/package.json packages/schema/
COPY packages/editor/package.json packages/editor/
COPY packages/cli/package.json packages/cli/
COPY packages/app/package.json packages/app/

RUN pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Build in dependency order: schema -> editor -> app
RUN pnpm --filter @ruminaider/flowprint-schema build \
 && pnpm --filter @ruminaider/flowprint-editor build \
 && pnpm --filter flowprint-app build

# Stage 2: Serve with nginx
FROM nginx:alpine

COPY --from=build /app/packages/app/dist /usr/share/nginx/html
COPY packages/app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
