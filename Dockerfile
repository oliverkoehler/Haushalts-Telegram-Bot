FROM node:20-alpine

# Zeitzone für korrekte Zeitstempel in /history
RUN apk add --no-cache tzdata
ENV TZ=Europe/Berlin

ENV NODE_ENV=production
# data.json landet hier (per Volume gemountet), nicht im Code-Verzeichnis
ENV DATA_DIR=/data

WORKDIR /app

# Erst nur die Manifeste kopieren -> besseres Layer-Caching
COPY package*.json ./
RUN npm ci --omit=dev

# Quellcode
COPY src ./src

# Datenverzeichnis anlegen und Rechte für den unprivilegierten node-User setzen
RUN mkdir -p /data && chown -R node:node /data /app
USER node

CMD ["node", "src/bot.js"]
