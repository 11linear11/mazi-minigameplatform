FROM node:20-alpine AS build
WORKDIR /app/server

RUN apk add --no-cache python3 make g++ && ln -sf /usr/bin/python3 /usr/bin/python

COPY server/package.json server/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS production
WORKDIR /app/server

COPY --from=build /app/server/node_modules ./node_modules
COPY server/ .

RUN mkdir -p data public/avatars

EXPOSE 4000

ENV PORT=4000

CMD ["node", "index.js"]
