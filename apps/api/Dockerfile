FROM node:18-slim

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npx prisma generate

COPY dist/ ./dist/

EXPOSE 3001

CMD ["node", "dist/index.js"]
