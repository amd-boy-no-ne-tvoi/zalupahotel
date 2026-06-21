FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile --filter pet-hotel-backend...

FROM node:20-alpine AS build
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY . .
WORKDIR /app/apps/backend
RUN pnpm build
RUN pnpm exec prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/backend/package.json ./apps/backend/
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules

WORKDIR /app/apps/backend
RUN mkdir -p uploads

EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/index.js"]
