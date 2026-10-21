FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY scripts ./scripts
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"]
