# --- deps: install production deps (build tools present so bcrypt compiles if no prebuild) ---
FROM node:20-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- runtime ---
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# multer stages uploads here before Cloudinary; ensure it exists
RUN mkdir -p public/uploads
EXPOSE 8010
CMD ["node", "index.js"]
