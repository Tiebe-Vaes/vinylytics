# Plain (non-standalone) build: the migrate step needs drizzle-orm's migrator,
# which the standalone trace would leave out.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx next build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
EXPOSE 3000
CMD ["npm", "run", "start:docker"]
