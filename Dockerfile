FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY server.js db.json ./

EXPOSE 3333

CMD ["npm", "start"]
