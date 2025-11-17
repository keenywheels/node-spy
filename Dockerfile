FROM node:lts-slim

# chromium
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        # Chromium и шрифты
        chromium \
        fonts-liberation \
        fonts-freefont-ttf \
        fonts-noto-color-emoji \
        fonts-dejavu-core \
        fonts-ipafont-gothic \
        \
        # Основные GUI/звуковые зависимости
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcups2 \
        libdbus-1-3 \
        libdrm2 \
        libgbm1 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libx11-xcb1 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libxss1 \
        libxtst6 \
        libxshmfence1 \
        \
        # Для headful-режима
        xvfb \
        xauth \
        upower \
        dbus-x11 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .

RUN npm run build

RUN echo '#!/bin/bash\n\
echo "Starting DBus system..."\n\
service dbus start\n\
echo "Starting DBus session..."\n\
eval "$(dbus-launch --sh-syntax)"\n\
export DBUS_SESSION_BUS_ADDRESS\n\
export DBUS_SESSION_BUS_PID\n\
echo "Starting scheduler.js"\n\
cd /app\n\
npm run scheduler\n\
' > /init.sh && chmod +x /init.sh

RUN echo '#!/bin/bash\n\
echo "DBus session running at $DBUS_SESSION_BUS_ADDRESS"\n\
cd /app\n\
# xvfb-run --server-args="-screen 0 1920x1080x24" npm run init $2 >> /var/log/cron.log\n\
Xvfb :99 -screen 0 1920x1080x24 &\n\
export DISPLAY=:99\n\
npm run init $2 >> /var/log/cron.log\n\
npm start $1 $2 >> /var/log/cron.log\n\
' > /app/run-app.sh && chmod +x /app/run-app.sh

RUN touch /var/log/cron.log
RUN chmod 666 /var/log/cron.log

CMD ["/init.sh"]
