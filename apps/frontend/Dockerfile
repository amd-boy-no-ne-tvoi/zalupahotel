FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/ ./packages/
RUN pnpm install --frozen-lockfile --filter frontend...

FROM node:20-alpine AS build
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY . .
WORKDIR /app/apps/frontend
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

FROM nginx:alpine AS runner
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
