FROM node:20-alpine

ARG NPM_TOKEN

ENV NPM_TOKEN=${NPM_TOKEN}

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc

RUN npm install -g pnpm && pnpm install

RUN rm -f .npmrc

COPY . .

CMD ["pnpm", "dev"] 