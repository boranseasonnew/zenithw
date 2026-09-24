# ZenithW

> Un espace média ciblé et sans publicité pour télécharger, convertir et remuxer les contenus que vous êtes autorisé à utiliser. ✨

[Application en ligne](https://zenithw.space) · [État](https://zenithw.space/status) · [Mises à jour](https://zenithw.space/updates) · [English](README.md) · [Türkçe](README.tr.md) · [Deutsch](README.de.md) · [日本語](README.ja.md)

Version actuelle : **v14.4**

![ZenithW web interface](docs/assets/zenithw-preview.png)

## ✨ Pourquoi ZenithW ?

ZenithW garde le travail média simple et calme : collez un lien, vérifiez ce que la source propose réellement, choisissez une sortie adaptée, puis enregistrez le fichier préparé. Pas de compte, d'extension, de mur payant ou de publicité dans le flux : seulement des outils utiles et des limites claires.

- **Un espace unique** pour les téléchargements, l'extraction audio, la conversion et le remux.
- **Respectueux de la vie privée :** l'historique reste dans le navigateur et les fichiers préparés expirent.
- **Des réglages honnêtes :** un profil est une préférence, pas la promesse que chaque source possède chaque format.
- **Prêt pour l'auto-hébergement :** Docker Compose lance l'interface et l'API ensemble sur votre machine ou serveur. 🐳

## Fonctionnalités

- Résout les médias depuis YouTube, TikTok, Instagram, X, Reddit et d'autres sources compatibles avec yt-dlp.
- Télécharge vidéos, audio, vidéos muettes, playlists et petits lots de liens.
- Convertit avec FFmpeg et remuxe les flux compatibles sans réencodage inutile.
- Prend en charge sous-titres, métadonnées, miniatures, SponsorBlock, annulation et progression en direct.
- Conserve l'historique dans le navigateur, pas dans un compte côté serveur.
- Propose une interface réactive sans framework en turc, anglais, français, allemand et japonais.

ZenithW suit un flux court et vérifiable : collez un lien pris en charge, examinez le média et les choix disponibles, puis préparez un fichier pour un téléchargement direct dans le navigateur. Aucun compte, extension ou client de bureau n'est nécessaire. L'interface reste volontairement compacte tout en exposant les décisions importantes pour une tâche média.

## Contrôles de téléchargement

L'écran d'accueil gère la sélection automatique, l'extraction audio, la vidéo muette, les playlists et les petits lots de liens. Lorsqu'une source propose plusieurs formats, ZenithW permet de choisir le conteneur, la résolution, le codec, le débit audio, les sous-titres, les métadonnées, la miniature, le modèle de nom de fichier et le comportement de SponsorBlock.

Les paramètres incluent trois profils pratiques :

- **Minimal** privilégie des fichiers petits et largement compatibles pour le partage rapide et le stockage limité.
- **Standard** vise une vidéo H.264/MP4 1080p équilibrée avec audio 192 kbps.
- **Qualité** privilégie la vidéo AV1/WebM haute résolution avec audio Opus lorsque la source la fournit.

Un profil est un point de départ, pas la garantie que chaque vidéo possède ce flux. Pour les vidéos YouTube, le serveur impose un plafond de 720p lorsqu'il est occupé et autorise jusqu'à 1080p uniquement au repos. Les solutions de repli ne peuvent pas dépasser silencieusement ce plafond ; les dimensions du flux choisi sont vérifiées. Les téléchargements audio et les sources hors YouTube gardent leur propre flux de sélection.

## Outils média

ZenithW comprend deux outils pour fichiers locaux en plus des téléchargements par lien :

- **Convertir** envoie un fichier pour une conversion FFmpeg limitée vers un format cible explicite.
- **Remuxer** copie les flux audio et vidéo compatibles dans un nouveau conteneur sans réencodage. C'est plus rapide et évite une perte de qualité inutile, mais demande des flux compatibles.

Les deux outils affichent leur état et renvoient un fichier préparé de courte durée au lieu de conserver une archive d'envois. Taille d'envoi, taille de sortie, durée, concurrence et temps de traitement sont limités côté serveur.

### Traitement sur l’appareil · Bêta

Convert et Remux proposent **Serveur**, **Préférer cet appareil** et **Cet appareil uniquement**. La bêta copie les flux audio/vidéo compatibles sans réencodage pour changer de conteneur ou extraire l’audio compatible. Le serveur reste le choix par défaut. Après un échec local, un accord explicite est nécessaire avant tout envoi ; le mode appareil uniquement n’envoie jamais le fichier. Limites : 64 Mio sur ordinateur, 24 Mio sur mobile/appareil à faible mémoire et 30 minutes. Sous-titres, chapitres et pièces jointes ne sont pas conservés. Les téléchargements par lien utilisent toujours le serveur. [Périmètre, limites et compilation](docs/LOCAL_MEDIA.md), en anglais.

## Disponibilité de YouTube

Les téléchargements YouTube sont proposés selon le principe du meilleur effort. YouTube peut temporairement appliquer des contrôles plus stricts ou bloquer des requêtes issues de plages IP de centres de données, notamment des serveurs cloud comme AWS. Le résultat peut alors ressembler à un échec même si ZenithW et sa chaîne de téléchargement fonctionnent normalement.

Dans l'intégration actuelle, aucun changement côté application ne peut garantir un accès ininterrompu lorsque le service amont restreint une IP de serveur. Cela ne signifie pas que YouTube a été supprimé ou désactivé. Les téléchargements restent activés pendant la surveillance de la situation.

ZenithW regroupe les recherches de métadonnées pour un même lien, utilise un cache court, applique des budgets YouTube distincts par visiteur et par hôte, supprime les démarrages en double et suspend les essais amont après une réponse HTTP 429 réelle. Ces contrôles réduisent le trafic inutile ; ils ne peuvent pas annuler les décisions de YouTube.

ZenithW ne peut pas toujours fournir un service continu et la disponibilité de YouTube n'est jamais garantie. Réglages de confidentialité, restrictions régionales, contenu supprimé, connexion requise et limites de plateforme restent hors du contrôle de ZenithW.

## Expérience utilisateur et confidentialité

ZenithW propose sans compte utilisateur une progression en direct, l'annulation, un historique local au navigateur, une navigation réactive sur ordinateur et mobile et plusieurs langues. Le serveur prépare les fichiers uniquement pour la fenêtre de transfert. Les liens sont de courte durée, liés au client demandeur et supprimés après utilisation ou expiration.

Une fonctionnalité ne garantit pas qu'une plateforme tierce expose un format donné ou accepte chaque demande. ZenithW signale ces limites au lieu de présenter silencieusement une sortie indisponible comme terminée.

## Architecture

| Couche | Environnement |
|---|---|
| Frontend | HTML, CSS et JavaScript natifs sur Cloudflare Pages |
| Edge | DNS, proxy, TLS et vérification d'origine Cloudflare |
| Backend | Flask, Gunicorn, gevent et Socket.IO sur Amazon EC2 (AWS) |
| Média | yt-dlp, FFmpeg, Deno/EJS et fournisseur de jeton PO facultatif |
| Gestion du service | Ubuntu, Nginx et systemd |

Le backend fonctionne volontairement avec **un seul worker**. L'état des tâches, les salons Socket.IO et les fichiers préparés sont locaux au processus ; des workers ou réplicas supplémentaires exigent une coordination et un stockage partagés.

## 🐳 Auto-hébergement avec Docker Compose

Docker Compose est la méthode la plus rapide pour une installation complète. Il lance ensemble le frontend, le reverse proxy, l'API, FFmpeg et un volume persistant de téléchargements. L'installation par défaut conserve volontairement **un seul worker backend**, adapté au modèle actuel de jobs, progression, annulation et fichiers préparés locaux au processus.

```bash
git clone https://github.com/boranseason/zenithw.git
cd zenithw
cp .env.example .env
docker compose up -d --build
```

Ouvrez `http://localhost:8080`. Si vous utilisez un autre port ou un domaine public, modifiez ensemble `ZENITHW_PORT` et `SELF_HOSTED_ORIGIN` dans `.env`, puis relancez `docker compose up -d`.

Le volume Docker `zenithw-downloads` conserve les fichiers temporaires. Le nettoyage habituel de ZenithW les supprime toujours après expiration ; le volume évite surtout qu'une mise à jour de conteneur n'interrompe inutilement une fenêtre de transfert.

### Cookies privés facultatifs

Certaines sources peuvent demander une session de navigateur connectée. Cette option est facultative et doit rester privée :

```bash
mkdir -p private
# Placez votre propre export Netscape dans private/cookies.txt.
cp compose.cookies.example.yml compose.cookies.yml
docker compose -f compose.yml -f compose.cookies.yml up -d
```

Ne validez ni ne partagez jamais `private/cookies.txt` ou `compose.cookies.yml`. ZenithW fonctionne sans cette surcharge ; elle n'est pas un contournement universel des restrictions de plateforme.

Pour une exposition publique, placez HTTPS et le pare-feu ou reverse proxy de votre choix devant Docker. Cloudflare est utile pour le déploiement officiel, mais il n'est **pas nécessaire** en auto-hébergement.

## 🛠️ Développement local

Prérequis : Python 3.10+, FFmpeg et un navigateur moderne.

```bash
git clone https://github.com/boranseason/zenithw.git
cd zenithw/backend
python -m venv .venv
```

Activez l'environnement, puis exécutez :

```bash
pip install --require-hashes -r requirements.lock
python app.py
```

L'API démarre sur `http://localhost:5000`. Servez `frontend/` avec un serveur de fichiers statiques. Activez CORS de développement uniquement pour un travail local inter-origine, jamais en production.

## 🔐 Principes de production

La production exige des valeurs privées fortes pour `SECRET_KEY` et `ORIGIN_SECRET`. Les limites d'exécution, le comportement du proxy approuvé, les budgets de fichiers temporaires et l'accès aux diagnostics sont configurés par les variables d'environnement documentées dans `backend/app.py`.

- Gardez secrets et données de navigateur exportées hors de Git.
- Gardez l'origine EC2 derrière Cloudflare et vérifiez l'en-tête d'origine partagé.
- Ne faites confiance aux en-têtes visiteurs qu'à travers la chaîne Cloudflare vers Nginx.
- Gardez les diagnostics privés et les réponses publiques de disponibilité minimales.
- Ne dépassez pas un worker avant de partager en sécurité l'état des tâches, le routage Socket.IO et les fichiers préparés.

## Endpoints principaux

| Endpoint | Rôle |
|---|---|
| `POST /info` | Résoudre métadonnées et formats |
| `POST /download` | Lancer un téléchargement ou une extraction |
| `POST /convert` | Convertir ou remuxer un fichier envoyé |
| `POST /cancel` | Annuler une tâche active |
| `GET /files/<token>` | Transférer un fichier préparé de courte durée |
| `GET /health` | Réponse minimale de disponibilité |
| `GET /ready` | État des dépendances et de la capacité |

## Sécurité et usage responsable

ZenithW valide les cibles distantes, bloque les destinations privées et link-local, limite les redirections, les protocoles des outils média, la concurrence et l'usage disque, puis distribue les fichiers préparés avec des jetons de courte durée. Aucun service Internet ne peut promettre un anonymat absolu ou une disponibilité continue.

Utilisez ZenithW uniquement pour des contenus que vous possédez, que vous êtes autorisé à télécharger ou que vous pouvez utiliser légalement. Les conditions des plateformes sources et les règles de droit d'auteur restent de votre responsabilité. ZenithW n'est affilié à aucune plateforme prise en charge.

Signalez les bugs reproductibles via [GitHub Issues](https://github.com/boranseason/zenithw/issues). N'incluez jamais de secrets, liens privés ou données personnelles dans des rapports publics.

## Licence

- ZenithW : AGPL-3.0-only
- Dépendances tierces : leurs licences respectives
- Détails : [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
