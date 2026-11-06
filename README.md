# Quiz orthographe – générateur automatique de vidéos TikTok

Vidéos verticales 1080×1920 de 10 mots (~100 s) : intro → 10 questions (3 choix,
7 s de réflexion, réponse) → appel à commenter. **Aucun mot à saisir.**

## Utilisation

```bash
npm install
npm run render                          # 1 vidéo avec 10 mots inédits → out/quiz-001.mp4 + légende .txt
node scripts/render.mjs --videos=7      # une semaine d'un coup
node scripts/render.mjs --mots=8        # vidéo plus courte
npm run studio                          # prévisualiser
```

Si Remotion ne trouve pas Chrome : `CHROME_PATH=/chemin/vers/chrome npm run render`.

## D'où viennent les mots

Tout est automatique, dans `scripts/mots.mjs` :

1. **Liste de fréquence du français** (sous-titres OpenSubtitles, projet
   [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords), licence CC BY-SA 4.0),
   téléchargée une fois puis mise en cache dans `data/cache/`. On garde les mots entre le
   1 500e et le 35 000e plus fréquents : connus de tous, mais pas triviaux.
2. **Dictionnaire Hunspell de Grammalecte** (paquet npm `dictionary-fr`, toutes variantes
   orthographiques) : ne garde que les formes de base (pas de verbes conjugués) et filtre les
   grossièretés (`french-badwords-list`).
3. **Générateur de fautes classiques** : consonne double ↔ simple, h/ph/th/rh, y ↔ i,
   accents, m devant p/b, -tion/-sion… Le mot doit contenir au moins un vrai piège.
   **Chaque faute est vérifiée dans le dictionnaire** : si elle existe (ex. « évènement »,
   graphie admise), elle est écartée. Il n'y a donc qu'une seule bonne réponse.

Résultat : ~1 700 mots, soit ~170 vidéos sans répétition. `data/historique.json` garde la
trace des mots déjà publiés pour ne jamais les réutiliser.

## Numéro du jour

Chaque vidéo affiche « JOUR N » sur l'écran d'ouverture, dans l'en-tête des questions, à la fin
(« Rendez-vous demain pour le jour N+1 ») et dans la légende. N = nombre de vidéos déjà générées
(dans `historique.json`) + 1.

## Son

- **Bruitages** (activés par défaut, volontairement doux) : souffle léger à chaque question, « toc »
  feutré sur les 3 dernières secondes du compte à rebours, deux notes de marimba sur la bonne réponse,
  petit arpège de fin.
  Générés par synthèse (`python3 scripts/generer-sons.py` → `public/sons/`), donc sans droits d'auteur.
  Pour les couper : `SONS = false` dans `scripts/render.mjs`, ou la variable `SONS=false`.
- **Musique de fond** (facultative) : dépose un fichier **libre de droits** nommé `public/musique.mp3`
  (ex. bibliothèque musicale de Pixabay), il est joué en boucle avec fondu, à `VOLUME_MUSIQUE` (0,15).
  Sans ce fichier, pas de musique. Une musique non libre de droits ferait couper le son par TikTok.
  Pour la portée, un son tendance ajouté dans TikTok au moment de publier reste le meilleur choix.

## Réglages

- **Nombre de mots par vidéo** : `NB_MOTS` en haut de `scripts/render.mjs` (la durée, le « 3/10 » et le « score sur 10 » s'adaptent tout seuls).
- Timing : constantes en haut de `src/Quiz.tsx` (`Q_REFLEXION_MIN` = temps de réflexion minimum ; il est allongé automatiquement avec peu de mots pour que la vidéo dépasse toujours 1 min).
- Plage de difficulté : `RANG_MIN` / `RANG_MAX` dans `scripts/mots.mjs`.
- Couleurs / police : objet `C` et `POLICE` dans `src/Quiz.tsx` (police Inter).
- Pas de son intégré : ajouter un son tendance dans TikTok, ou un `<Audio>` Remotion.

## Envoi automatique sur TikTok (en brouillon)

Chaque vidéo générée est envoyée dans la **boîte de réception de ton app TikTok**. Tu touches la
notification, tu colles la légende, tu ajoutes un son et tu publies. TikTok garde le brouillon 24 h.

### 1. Créer l'app TikTok (une fois)

1. https://developers.tiktok.com → connecte-toi avec ton compte TikTok → **Manage apps → Connect an app**.
2. Coche la plateforme **Web**, ajoute **Login Kit** et **Content Posting API**
   (scopes `user.info.basic` et `video.upload`, pas besoin de « Direct Post »).
3. Login Kit → Web → **Redirect URI** : `https://xavierbriole.github.io/quiz-orthographe/callback.html` (page `docs/callback.html`, hébergée par GitHub Pages)
4. Crée une **Sandbox** et ajoute **ton compte TikTok** dans *Target users*
   (permet d'utiliser l'API sur ton compte sans faire valider l'app).
5. Note le **Client key** et le **Client secret** de la sandbox.

### 2. Connecter ton compte (une fois, sur ton ordinateur)

```bash
npm install
cp config/tiktok.exemple.json config/tiktok.json   # puis colle client key + secret dedans
node scripts/tiktok.mjs connexion
```

Ouvre le lien, autorise, puis copie l'adresse affichée sur la page de retour et colle-la dans le terminal. Le script
affiche une valeur `TIKTOK_REFRESH_TOKEN=...` à copier pour le serveur. **Supprime ensuite
`data/tiktok-token.json` de ton ordinateur** : TikTok invalide l'ancien accès à chaque
renouvellement, une seule machine doit s'en servir.

## Déploiement sur un serveur

Le `Dockerfile` contient tout (Chrome headless, police embarquée). Le conteneur génère et envoie
la vidéo du jour, puis s'arrête : configure-le en **tâche planifiée** (cron) une fois par jour.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | Identifiants de l'app TikTok |
| `TIKTOK_REFRESH_TOKEN` | Valeur affichée par l'étape « connexion » (sert seulement au 1er lancement) |
| `DATA_DIR` | Dossier persistant, `/data` par défaut dans le Dockerfile |
| `NB_MOTS` | Nombre de mots par vidéo (défaut 5) |
| `DISCORD_WEBHOOK_URL` | Facultatif mais conseillé : webhook Discord pour les notifications (Paramètres du serveur → Intégrations → Webhooks) |

### ⚠ Le volume persistant est obligatoire

Monte un volume (disque) sur `/data`. Il garde :
- `historique.json` : les mots déjà publiés (sans lui, des mots reviendraient) ;
- `tiktok-token.json` : l'accès TikTok, renouvelé à chaque envoi. **Sans volume, l'accès est perdu
  au redémarrage suivant et il faut refaire la connexion.**

### Ce que tu reçois sur Discord (via `DISCORD_WEBHOOK_URL`)

- ✅ un message avec la légende en texte et une card « Jour 12 prêt dans TikTok » (mots, n° de vidéo, durée) : « Copier le texte » ne copie que la légende ;
- ❌ « échec » avec la raison (dans ce cas les mots ne sont pas consommés, ils resteront pour la suivante) ;
- ⚠ « stock bas » quand il reste moins de 20 vidéos de mots inédits.

Sans `DISCORD_WEBHOOK_URL`, tout part dans les logs du service. TikTok t'envoie de toute façon sa propre
notification quand le brouillon arrive.

**Si la sandbox ne suffit pas** (erreur d'autorisation à l'envoi), il faut soumettre l'app à
validation (onglet *App review*) : description, liens vers une politique de confidentialité et des
conditions d'utilisation, et une courte vidéo de démo.

Ne partage jamais `config/tiktok.json`, `TIKTOK_CLIENT_SECRET` ni le refresh token.
