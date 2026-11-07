# Quiz langues – générateur automatique de vidéos quiz (TikTok, Xiaohongshu)

Vidéos verticales 1080×1920 de 10 mots (~100 s) : intro → 10 questions (3 choix,
7 s de réflexion, réponse) → appel à commenter. **Aucun mot à saisir.**

Trois quiz, même format, même pipeline :

| Quiz | Pour qui | Question | Publication |
|---|---|---|---|
| `orthographe` | francophones | « Quelle est la bonne orthographe ? » | brouillon TikTok (automatique) |
| `chinois` | **anglophones** qui apprennent le chinois (public bien plus large) | 汉字 + pinyin → sens en anglais, **interface en anglais**, thème laque rouge et or | brouillon TikTok sur un **compte dédié** (automatique) |
| `francais` | sinophones qui apprennent le français | mot français + nature (n.f., v.…) → sens en chinois, **interface en chinois simplifié** | Xiaohongshu (à la main, via Discord) |

## Utilisation

```bash
npm install
npm run render                          # 1 vidéo avec 10 mots inédits → out/quiz-001.mp4 + légende .txt
node scripts/render.mjs --videos=7      # une semaine d'un coup
node scripts/render.mjs --mots=8        # vidéo plus courte
node scripts/render.mjs --quiz=chinois  # quiz de chinois → out/chinois-001.mp4
node scripts/render.mjs --quiz=francais # quiz de français → out/francais-001.mp4 + -couverture.png + .txt (titre + texte)
node scripts/render.mjs --quiz=orthographe,chinois,francais   # les trois d'un coup
npm run studio                          # prévisualiser (compositions QuizOrthographe, QuizChinois, QuizFrancais)
```

Sans `--quiz` ni variable `QUIZ`, seul le quiz d'orthographe est généré (comme avant).

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

## Quiz de chinois et de français : d'où viennent les mots

Les deux quiz partagent `data/vocabulaire.txt` : ~390 mots courants (niveau HSK 1 à 3 environ), avec
caractères, pinyin, traduction française (avec article), traduction anglaise et catégorie. Soit ~77 vidéos par quiz à 5 mots.

- Les vidéos avancent **du niveau 1 au niveau 3** au fil des jours, en variant les catégories dans une vidéo.
- Les 2 mauvaises réponses sont tirées **dans la même catégorie** (ex. trois animaux) pour que ce ne soit pas trop facile.
- Les mots trop proches (孩子 « l'enfant » / 儿子 « le fils », 看 « regarder » / 读 « lire »…) portent un même
  **groupe** et ne sont jamais proposés ensemble : il n'y a qu'une seule bonne réponse.
- Pour prolonger la série, il suffit d'ajouter des lignes au fichier (le format est expliqué en tête).
  Chaque quiz a son historique (`historique-chinois.json`, `historique-francais.json`) : un mot déjà
  passé dans le quiz de chinois peut encore servir dans celui de français.

Les caractères chinois utilisent les polices **Noto Sans SC** et **Noto Serif SC** embarquées (`@fontsource/…`) :
rendu identique sur le serveur, sans police à installer.

### Habillage

Chaque quiz a son thème dans `src/themes.tsx` (couleurs, polices, textes, décor). Le quiz de chinois a un
habillage d'inspiration chinoise : fond laque rouge, filets et grecques « 回 » dorés aux coins, sceau 中文 à
l'ouverture, grand caractère 学 en filigrane, fleurs de prunier qui tombent lentement, police à empattements.

## Publier sur Xiaohongshu (quiz `francais`)

Xiaohongshu n'a pas d'API de publication ouverte aux particuliers, donc pas de brouillon automatique.
À la place, avec `DISCORD_WEBHOOK_URL`, tu reçois sur Discord :

1. un message avec **le titre** seul (20 caractères max, facile à copier) ;
2. un message avec **le texte** (accroche, liste des mots du jour, hashtags), **la vidéo** et **la couverture** en pièces jointes.

Sur le téléphone : enregistre la vidéo et la couverture, ouvre Xiaohongshu → « + » → choisis la vidéo,
mets la couverture, colle le titre et le texte, publie. Discord limite les pièces jointes à 10 Mo par message
(serveur sans boost) ; les vidéos font ~7,5 Mo. Si ton serveur Discord est boosté, `DISCORD_LIMITE_MO` peut être augmenté.

⚠ Sur un serveur, `out/` disparaît à chaque lancement du conteneur : **sans Discord, la vidéo Xiaohongshu est perdue.**

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
3. Login Kit → Web → **Redirect URI** : `https://xavierbriole.github.io/quiz-langues/callback.html` (page `docs/callback.html`, hébergée par GitHub Pages)
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

Le `Dockerfile` contient tout (Chrome headless, polices embarquées). Le conteneur génère et envoie
la vidéo du jour, puis s'arrête : configure-le en **tâche planifiée** (cron) une fois par jour.

### Sur Railway : un service par quiz

Les trois services partent du même dépôt (branche `main`) et de la même image ; seule la variable `QUIZ`,
l'horaire et le volume changent. Chaque quiz publie ainsi à l'heure de son public, et une panne n'emporte pas les autres.

| Service | `QUIZ` | Cron (UTC) | Heure de Paris (hiver / été) | Volume `/data` |
|---|---|---|---|---|
| `orthographe` | `orthographe` | `0 8 * * *` | 9h / 10h | historique + accès TikTok principal |
| `francais` | `francais` | `0 11 * * *` | 12h / 13h (19h–20h à Pékin) | historique |
| `chinois` | `chinois` | `0 13 * * *` | 14h / 15h | historique + accès TikTok « chinois » |

Railway compte les horaires en UTC : à l'heure d'été, tout part une heure plus tard à Paris.

Un 4e service, `generateur`, ne génère rien : il porte les **variables communes**
(`TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `DISCORD_WEBHOOK_URL`, `NB_MOTS`). Les trois services de quiz les
reprennent par référence (`${{generateur.NOM}}`) : on les modifie à un seul endroit. Il n'a pas de cron et sa
commande de lancement se contente d'afficher un message.
Propres à chaque service de quiz : `QUIZ`, `DATA_DIR=/data`, et l'accès TikTok — `TIKTOK_REFRESH_TOKEN` sur
`orthographe`, `TIKTOK_REFRESH_TOKEN_CHINOIS` sur `chinois`. **Ne jamais mettre un même accès TikTok sur deux
services** : ils se l'invalideraient mutuellement.

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | Identifiants de l'app TikTok |
| `TIKTOK_REFRESH_TOKEN` | Valeur affichée par l'étape « connexion » (sert seulement au 1er lancement) |
| `DATA_DIR` | Dossier persistant, `/data` par défaut dans le Dockerfile |
| `NB_MOTS` | Nombre de mots par vidéo (défaut 5) |
| `QUIZ` | Quiz à générer à chaque lancement (défaut `orthographe`). Un seul par service sur Railway ; plusieurs possibles, séparés par des virgules |
| `TIKTOK_REFRESH_TOKEN_CHINOIS` | Compte TikTok dédié au quiz de chinois, en anglais (sur le service `chinois`, voir plus bas) |
| `QUALITE` | Facultatif : compression h264 (CRF, défaut 23 ; plus haut = plus léger) |
| `DISCORD_LIMITE_MO` | Facultatif : taille max des pièces jointes Discord en Mo (défaut 10) |
| `DISCORD_WEBHOOK_URL` | Facultatif mais conseillé : webhook Discord pour les notifications (Paramètres du serveur → Intégrations → Webhooks) |

### ⚠ Le volume persistant est obligatoire

Monte un volume (disque) sur `/data`. Il garde :
- `historique.json`, `historique-chinois.json`, `historique-francais.json` : les mots déjà publiés
  (sans eux, des mots reviendraient) ;
- `tiktok-token.json` (et `tiktok-token-chinois.json` si compte dédié) : l'accès TikTok, renouvelé à chaque envoi. **Sans volume, l'accès est perdu
  au redémarrage suivant et il faut refaire la connexion.**

### Ce que tu reçois sur Discord (via `DISCORD_WEBHOOK_URL`)

- ✅ un message avec la légende en texte et une card « Orthographe – jour 12 prêt dans TikTok » (mots, n° de vidéo, durée) : « Copier le texte » ne copie que la légende ;
- ❌ « échec » avec la raison (dans ce cas les mots ne sont pas consommés, ils resteront pour la suivante) ;
- ⚠ « stock bas » quand il reste moins de 20 vidéos de mots inédits (par quiz) ;
- 📕 pour le quiz `francais` : le titre, puis le texte + la vidéo + la couverture à publier sur Xiaohongshu (voir plus haut).

Sans `DISCORD_WEBHOOK_URL`, tout part dans les logs du service. TikTok t'envoie de toute façon sa propre
notification quand le brouillon arrive.

### Le compte TikTok du quiz de chinois (en anglais)

Le quiz de chinois vise un public anglophone : il ne part **jamais** sur le compte principal (francophone).
Tant que son compte n'est pas connecté, la vidéo est envoyée sur Discord avec la légende, pour la publier à la main.

1. Crée le compte TikTok.
2. Dans l'app TikTok (developers.tiktok.com), ajoute ce compte dans les *Target users* de la sandbox.
3. Sur ton ordinateur, déconnecte-toi de TikTok dans le navigateur puis :
   `node scripts/tiktok.mjs connexion chinois` (en te connectant avec ce compte).
4. Mets la valeur affichée dans la variable `TIKTOK_REFRESH_TOKEN_CHINOIS` du service Railway `chinois`, puis supprime
   `data/tiktok-token-chinois.json` de ton ordinateur.

Dès que ce compte est connecté, les vidéos de chinois arrivent en brouillon dans sa boîte TikTok.

**Si la sandbox ne suffit pas** (erreur d'autorisation à l'envoi), il faut soumettre l'app à
validation (onglet *App review*) : description, liens vers une politique de confidentialité et des
conditions d'utilisation, et une courte vidéo de démo.

Ne partage jamais `config/tiktok.json`, `TIKTOK_CLIENT_SECRET` ni les refresh tokens.
