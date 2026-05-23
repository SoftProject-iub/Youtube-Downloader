FROM node:20-bullseye

# Install Chromium + ffmpeg + dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install yt-dlp

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Chromium path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Prevent Chromium crashes
ENV NODE_OPTIONS=--max-old-space-size=512

CMD ["npm", "start"]
