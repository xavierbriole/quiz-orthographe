# Image pour lancer le générateur sur un serveur (tâche planifiée).
# La commande s'exécute, génère + envoie la vidéo du jour, puis s'arrête.
FROM node:22-bookworm-slim

# Bibliothèques nécessaires au Chrome headless utilisé par Remotion
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev \
    libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Télécharge le Chrome headless de Remotion au build (pas à chaque lancement)
RUN npx remotion browser ensure

# Dossier persistant : monte un volume ici (historique des mots + accès TikTok)
ENV DATA_DIR=/data
CMD ["node", "scripts/render.mjs"]
