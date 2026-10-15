FROM node:22-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_APP_ENV=production
ARG NEXT_PUBLIC_BFF_URL=https://api.example-media.com
ARG NEXT_PUBLIC_BFF_API_KEY=""

ENV NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV} \
    NEXT_PUBLIC_BFF_URL=${NEXT_PUBLIC_BFF_URL} \
    NEXT_PUBLIC_BFF_API_KEY=${NEXT_PUBLIC_BFF_API_KEY} \
    NEXT_BUILD_STANDALONE=true

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
