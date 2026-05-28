FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY src/ ./src/

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=build /usr/src/app/dist ./dist
COPY drizzle.config.ts ./
COPY drizzle/ ./drizzle/

EXPOSE 3333

ENV NODE_ENV=production
ENV PORT=3333

CMD ["node", "dist/index.js"]
