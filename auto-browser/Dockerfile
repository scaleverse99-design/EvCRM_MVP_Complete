# EvCRM Auto Browser — Azure Container App
# Playwright + Chromium service that converts Indian auto site pages
# into clean extracted facts. No LLM. No AI. Pure browser + deterministic extraction.

FROM node:20-slim

# Install Chromium system dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-freefont-ttf \
    fonts-noto-color-emoji \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Tell Playwright to use the system Chromium (saves 170MB download)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 8080
CMD ["node", "server.js"]
