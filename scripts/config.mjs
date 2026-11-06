// Toute la configuration passe par des variables d'environnement (pratique sur un serveur).
// En local, on peut aussi utiliser config/tiktok.json.
import fs from "node:fs";
import path from "node:path";

const fichierLocal = fs.existsSync("config/tiktok.json")
  ? JSON.parse(fs.readFileSync("config/tiktok.json", "utf8"))
  : {};

// Dossier persistant : historique des mots + accès TikTok.
// Sur le serveur, il DOIT pointer vers un disque/volume qui survit aux redémarrages.
export const DATA_DIR = process.env.DATA_DIR || "data";
fs.mkdirSync(DATA_DIR, { recursive: true });
export const chemin = (f) => path.join(DATA_DIR, f);

export const tiktok = {
  client_key: process.env.TIKTOK_CLIENT_KEY || fichierLocal.client_key,
  client_secret: process.env.TIKTOK_CLIENT_SECRET || fichierLocal.client_secret,
  redirect_uri: process.env.TIKTOK_REDIRECT_URI || fichierLocal.redirect_uri || "https://xavierbriole.github.io/quiz-orthographe/callback.html",
  // Utilisé une seule fois pour amorcer le serveur, tant qu'aucun token n'est sauvegardé dans DATA_DIR
  refresh_token_initial: process.env.TIKTOK_REFRESH_TOKEN,
};

// Notifications Discord (facultatif) : URL d'un webhook de ton serveur Discord
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export const COULEURS = { succes: 0x22c55e, attention: 0xfacc15, erreur: 0xef4444 };

// Un seul message : le texte (`copiable`, ex. la légende) + une card en dessous.
// « Copier le texte » sur le message ne copie que le texte, pas la card.
export async function notifier(titre, description = "", { copiable = "", couleur = COULEURS.succes, champs = [] } = {}) {
  console.log(`[${titre}] ${description}${copiable ? "\n" + copiable : ""}`);
  if (!DISCORD_WEBHOOK_URL) return;
  try {
    const r = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: copiable.slice(0, 2000),
        embeds: [
          {
            title: titre,
            description: description || undefined,
            color: couleur,
            fields: champs.map((c) => ({ name: c.name, value: String(c.value).slice(0, 1024), inline: Boolean(c.inline) })),
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
    if (!r.ok) throw new Error(`Discord a répondu ${r.status} : ${await r.text()}`);
  } catch (e) {
    console.error("Notification Discord impossible :", e.message);
  }
}
