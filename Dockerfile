FROM ubuntu:22.04

# Установка переменных окружения для избежания интерактивных запросов
ENV DEBIAN_FRONTEND=noninteractive

# Установка Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Обновление пакетов и установка необходимого ПО
RUN apt-get update && apt-get install -y \
    x11vnc \
    xvfb \
    x11-apps \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    nodejs \
    build-essential \
    python3 \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Установка Google Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Создание директории для приложения
WORKDIR /app

# Копирование package.json и package-lock.json (если есть)
COPY package*.json ./

# Установка зависимостей Node.js
RUN npm install

# Копирование исходного кода приложения
COPY . .

# Сборка проекта (если требуется)
RUN if [ -f package.json ] && grep -q '"build"' package.json; then npm run build; fi

# Создание директории для VNC и установка пароля
RUN mkdir -p /root/.vnc && \
    x11vnc -storepasswd 1234 /root/.vnc/passwd

# Создание скрипта инициализации
RUN echo '#!/bin/bash\n\
# Запуск виртуального дисплея\n\
Xvfb :0 -screen 0 1920x1080x24 &\n\
export DISPLAY=:0\n\
\n\
# Запуск VNC сервера\n\
#x11vnc -forever -usepw -display :0 &\n\
\n\
# Запуск cron\n\
cron -f\n\
\n\
wait' > /init.sh && chmod +x /init.sh

# Создание отдельного скрипта для приложения
RUN echo '#!/bin/bash\n\
export DISPLAY=:0\n\
cd /app\n\
# Запуск вашего приложения\n\
npm start' > /app/run-app.sh && chmod +x /app/run-app.sh

RUN touch /var/log/cron.log
RUN chmod 666 /var/log/cron.log

# Настройка cron задачи
RUN echo "35 * * * * /app/run-app.sh >> /var/log/cron.log 2>&1" | crontab -

CMD ["/init.sh"]
