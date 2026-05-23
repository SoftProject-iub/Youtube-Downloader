FROM node:20-bullseye

# Install Chromium + ffmpeg + yt-dlp deps
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    python3 \
    python3-pip \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install yt-dlp

# App directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install node modules
RUN npm install

# Copy project
COPY . .

# Railway PORT
ENV PORT=3000

# Chromium path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Start bot
CMD ["npm", "start"]