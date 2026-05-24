FROM node:20-bookworm

# Install dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    python3.11 \
    python3-pip \
    python-is-python3 \
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

# Force Python 3.11
RUN ln -sf /usr/bin/python3.11 /usr/bin/python

# Install latest yt-dlp
RUN pip3 install --break-system-packages --upgrade yt-dlp

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

ENV NODE_OPTIONS=--max-old-space-size=512

CMD ["npm", "start"]
