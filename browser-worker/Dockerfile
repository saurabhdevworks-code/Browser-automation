FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npx playwright install --with-deps chromium
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
EXPOSE 3001
CMD ["npm","start"]
