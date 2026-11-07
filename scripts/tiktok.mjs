// Envoi des vidéos en BROUILLON dans la boîte de réception TikTok (Content Posting API, scope video.upload).
//
//   node scripts/tiktok.mjs connexion            → une seule fois, SUR TON ORDINATEUR : connecte ton compte
//   node scripts/tiktok.mjs connexion chinois    → connecte un 2e compte, dédié au quiz de chinois (facultatif)
//   node scripts/tiktok.mjs envoyer out/x.mp4 [chinois] → envoie une vidéo à la main
import fs from "node:fs";
import crypto from "node:crypto";
import readline from "node:readline/promises";
import { tiktok as cfg, chemin } from "./config.mjs";

const API = "https://open.tiktokapis.com";

// Plusieurs comptes TikTok possibles : le compte principal (compte = null) et des comptes nommés
// (ex. « chinois »), chacun avec son fichier d'accès et sa variable TIKTOK_REFRESH_TOKEN_<NOM>.
const fichierToken = (compte) => chemin(compte ? `tiktok-token-${compte}.json` : "tiktok-token.json");
const refreshInitial = (compte) =>
  compte ? process.env[`TIKTOK_REFRESH_TOKEN_${compte.toUpperCase()}`] : cfg.refresh_token_initial;
const nomCompte = (compte) => (compte ? `compte TikTok « ${compte} »` : "compte TikTok");

function compteConnecte(compte) {
  return Boolean(cfg.client_key && cfg.client_secret && (fs.existsSync(fichierToken(compte)) || refreshInitial(compte)));
}

/** Le compte à utiliser : le compte dédié s'il est connecté, sinon le compte principal (ou null si aucun). */
export function compteTikTok(compteDedie) {
  if (compteDedie && compteConnecte(compteDedie)) return { compte: compteDedie };
  return compteConnecte(null) ? { compte: null } : null;
}

async function appelToken(params, compte) {
  if (!cfg.client_key || !cfg.client_secret) throw new Error("TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET manquants");
  const r = await fetch(`${API}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: cfg.client_key, client_secret: cfg.client_secret, ...params }),
  });
  const json = await r.json();
  if (!json.access_token) throw new Error(`Erreur TikTok (token) : ${JSON.stringify(json)}`);
  const maintenant = Date.now();
  const token = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    open_id: json.open_id,
    expire_le: maintenant + (json.expires_in - 120) * 1000,
    refresh_expire_le: maintenant + json.refresh_expires_in * 1000,
  };
  // TikTok renvoie un NOUVEAU refresh token à chaque fois et invalide l'ancien : on le sauvegarde tout de suite
  fs.writeFileSync(fichierToken(compte), JSON.stringify(token, null, 2));
  return token;
}

async function accessToken(compte) {
  const fichier = fichierToken(compte);
  const variable = compte ? `TIKTOK_REFRESH_TOKEN_${compte.toUpperCase()}` : "TIKTOK_REFRESH_TOKEN";
  if (!fs.existsSync(fichier)) {
    const initial = refreshInitial(compte);
    if (!initial) throw new Error(`${nomCompte(compte)} non connecté (${variable} manquant)`);
    return (await appelToken({ grant_type: "refresh_token", refresh_token: initial }, compte)).access_token;
  }
  const t = JSON.parse(fs.readFileSync(fichier, "utf8"));
  if (Date.now() < t.expire_le) return t.access_token;
  if (Date.now() > t.refresh_expire_le)
    throw new Error(`Connexion au ${nomCompte(compte)} expirée : refais la connexion et mets à jour ${variable}`);
  return (await appelToken({ grant_type: "refresh_token", refresh_token: t.refresh_token }, compte)).access_token;
}

async function connexion(compte) {
  const state = crypto.randomBytes(12).toString("hex");
  // PKCE : TikTok attend l'empreinte SHA-256 du verifier encodée en HEXADÉCIMAL (pas en base64url)
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const code_verifier = Array.from(crypto.randomBytes(64), (b) => caracteres[b % caracteres.length]).join("");
  const code_challenge = crypto.createHash("sha256").update(code_verifier).digest("hex");
  const url =
    "https://www.tiktok.com/v2/auth/authorize/?" +
    new URLSearchParams({
      client_key: cfg.client_key,
      response_type: "code",
      scope: "user.info.basic,video.upload",
      redirect_uri: cfg.redirect_uri,
      state,
      code_challenge,
      code_challenge_method: "S256",
    });

  if (compte) console.log(`\nConnexion du ${nomCompte(compte)} : connecte-toi à TikTok avec CE compte-là dans le navigateur.`);
  console.log("\n1. Ouvre ce lien dans ton navigateur et autorise l'app :\n\n" + url + "\n");
  console.log("2. Tu arrives ensuite sur la page de retour « Autorisation reçue ».");
  console.log("   Clique sur « Copier l'adresse » et colle-la ici.\n");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const retour = new URL((await rl.question("Adresse : ")).trim());
  rl.close();

  if (retour.searchParams.get("error")) throw new Error(retour.searchParams.get("error_description"));
  if (retour.searchParams.get("state") !== state) throw new Error("Le paramètre state ne correspond pas, recommence.");
  const token = await appelToken({
    grant_type: "authorization_code",
    code: retour.searchParams.get("code"),
    redirect_uri: cfg.redirect_uri,
    code_verifier,
  }, compte);
  const variable = compte ? `TIKTOK_REFRESH_TOKEN_${compte.toUpperCase()}` : "TIKTOK_REFRESH_TOKEN";
  console.log(`\n✔ ${nomCompte(compte)[0].toUpperCase() + nomCompte(compte).slice(1)} connecté.`);
  console.log("\nPour le serveur, ajoute cette variable d'environnement :\n");
  console.log(`${variable}=${token.refresh_token}\n`);
  console.log("⚠ Puis SUPPRIME le fichier " + fichierToken(compte) + " de ton ordinateur et n'envoie plus de vidéo depuis ici :");
  console.log("  dès que le serveur utilise ce token, TikTok invalide la copie locale (et inversement).");
}

async function api(route, corps, token) {
  const r = await fetch(`${API}${route}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(corps),
  });
  const json = await r.json();
  if (json.error?.code && json.error.code !== "ok") throw new Error(`Erreur TikTok ${route} : ${json.error.code} – ${json.error.message}`);
  return json.data;
}

/** Envoie une vidéo dans la boîte de réception TikTok. Renvoie { publish_id, status }. */
export async function envoyerBrouillon(cheminVideo, compte = null) {
  const token = await accessToken(compte);
  const video = fs.readFileSync(cheminVideo);
  const taille = video.length;

  // 1. Initialisation (une seule partie : nos vidéos font ~10 Mo, sous la limite de 64 Mo par partie)
  const { publish_id, upload_url } = await api(
    "/v2/post/publish/inbox/video/init/",
    { source_info: { source: "FILE_UPLOAD", video_size: taille, chunk_size: taille, total_chunk_count: 1 } },
    token
  );

  // 2. Envoi du fichier
  const up = await fetch(upload_url, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Range": `bytes 0-${taille - 1}/${taille}` },
    body: video,
  });
  if (!up.ok) throw new Error(`Envoi du fichier refusé (${up.status}) : ${await up.text()}`);

  // 3. Attendre que TikTok l'ait déposée dans la boîte de réception
  console.log(`publish_id : ${publish_id}`);
  let dernier = "";
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const { status, fail_reason } = await api("/v2/post/publish/status/fetch/", { publish_id }, token);
    if (status !== dernier) console.log(`Statut TikTok : ${(dernier = status)}`);
    if (status === "SEND_TO_USER_INBOX" || status === "PUBLISH_COMPLETE") return { publish_id, status };
    if (status === "FAILED") throw new Error(`TikTok a refusé la vidéo : ${fail_reason}`);
  }
  // Toujours en traitement : pas une erreur, la vidéo arrivera probablement plus tard
  return { publish_id, status: dernier };
}

/** Affiche le statut d'un envoi. */
export async function statut(publish_id, compte = null) {
  const token = await accessToken(compte);
  return api("/v2/post/publish/status/fetch/", { publish_id }, token);
}

// ---------- Ligne de commande ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, fichier, compteArg] = process.argv.slice(2);
  try {
    if (cmd === "connexion") await connexion(fichier || null); // ici le 2e argument est le nom du compte
    else if (cmd === "envoyer" && fichier) {
      const { publish_id, status } = await envoyerBrouillon(fichier, compteArg || null);
      if (status === "SEND_TO_USER_INBOX" || status === "PUBLISH_COMPLETE")
        console.log("✔ Déposée dans ta boîte TikTok : ouvre l'appli, touche la notification et publie.");
      else console.log(`⏳ TikTok traite encore la vidéo. Vérifie plus tard : node scripts/tiktok.mjs statut ${publish_id}`);
    } else if (cmd === "statut" && fichier) {
      console.log(await statut(fichier, compteArg || null));
    } else
      console.log(
        "Usage : node scripts/tiktok.mjs connexion [compte] | envoyer <fichier.mp4> [compte] | statut <publish_id> [compte]"
      );
  } catch (e) {
    console.error("✖ " + e.message);
    process.exit(1);
  }
}
