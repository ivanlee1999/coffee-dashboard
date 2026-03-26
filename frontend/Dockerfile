FROM node:20-slim AS build

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Serve with a lightweight static server ---
FROM node:20-slim

WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/dist /app/dist

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
