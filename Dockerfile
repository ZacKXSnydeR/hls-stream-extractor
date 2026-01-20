FROM ghcr.io/puppeteer/puppeteer:23.0.0

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 3000

ENV PORT=3000

CMD ["node", "--expose-gc", "server.js"]
