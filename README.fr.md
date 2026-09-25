# ZenithW

> Un espace média ciblé et sans publicité pour télécharger, convertir et remuxer les contenus que vous êtes autorisé à utiliser. ✨

[Application](https://zenithw.space) · [Statut](https://zenithw.space/status) · [Mises à jour](https://zenithw.space/updates) · [English](README.md) · [Türkçe](README.tr.md) · [Deutsch](README.de.md) · [日本語](README.ja.md)

Version actuelle : **v14.4**

![Interface web ZenithW](docs/assets/zenithw-preview.png)

## ✨ Pourquoi ZenithW ?

ZenithW garde volontairement le traitement des médias simple : collez un lien pris en charge, examinez ce que la source propose réellement, choisissez la sortie souhaitée puis téléchargez le fichier préparé.

Aucun compte, extension de navigateur, paywall, abonnement ou couche publicitaire n'est nécessaire.

Seulement des outils média pratiques, des contrôles clairs et des limites annoncées honnêtement.

- **Un espace unique** pour les téléchargements, l'extraction audio, la conversion et le remux.
- **Respect de la vie privée par défaut :** l'historique reste dans le navigateur et les fichiers préparés expirent automatiquement.
- **Contrôles honnêtes :** un profil est une préférence, pas la promesse que chaque source propose chaque format.
- **Sans publicité :** ZenithW n'ajoute pas de publicités au flux de téléchargement.
- **Prêt pour l'auto-hébergement :** Docker Compose peut exécuter l'interface complète et l'API sur votre propre machine ou serveur. 🐳

## Fonctionnalités

ZenithW fonctionne avec les sources média compatibles avec yt-dlp qui sont prises en charge.

Le service public prend actuellement en charge des plateformes telles que :

- TikTok
- Instagram
- X
- Reddit
- ainsi que d'autres sources compatibles prises en charge par l'intégration yt-dlp active

ZenithW peut :

- télécharger des vidéos et de l'audio ;
- extraire l'audio d'un média ;
- télécharger une vidéo sans audio lorsque la source le permet ;
- traiter des playlists et de petits lots de liens ;
- convertir des fichiers avec FFmpeg ;
- remuxer des flux audio et vidéo compatibles sans réencodage inutile ;
- télécharger des sous-titres ;
- conserver les métadonnées prises en charge ;
- télécharger et intégrer des miniatures ;
- utiliser SponsorBlock lorsqu'il est disponible ;
- annuler les tâches actives ;
- afficher la progression en temps réel ;
- conserver l'historique localement dans le navigateur sans imposer de compte côté serveur.

> **Avis YouTube :** les téléchargements YouTube sont actuellement désactivés sur le site public de ZenithW en raison de restrictions d'accès en amont affectant les requêtes provenant d'infrastructures hébergées et de centres de données. Consultez la section **Disponibilité de YouTube** ci-dessous.

Le flux de travail est court et transparent :

1. Collez un lien pris en charge.
2. Vérifiez les informations du média et les formats disponibles.
3. Configurez la sortie.
4. Lancez la tâche.
5. Téléchargez le fichier préparé directement depuis le navigateur.

Aucun compte, extension de navigateur ou client de bureau n'est requis pour la version web.

## Contrôles de téléchargement

L'interface principale prend en charge :

- la sélection automatique du format ;
- le téléchargement vidéo ;
- l'extraction audio ;
- la vidéo sans audio ;
- les playlists ;
- les petits lots de liens ;
- la résolution ;
- le conteneur ;
- les préférences de codec ;
- le débit audio ;
- les sous-titres ;
- l'intégration des métadonnées ;
- les miniatures ;
- les modèles de nom de fichier ;
- les options SponsorBlock.

Les options disponibles dépendent de ce que la plateforme source fournit réellement.

ZenithW ne prétend pas qu'un format inexistant est disponible.

### Profils de téléchargement

ZenithW propose trois profils pratiques.

#### Minimal

Privilégie les fichiers plus petits, les transferts rapides, une large compatibilité et une consommation de stockage réduite.

#### Standard

Vise un équilibre entre qualité et compatibilité.

Cible typique :

- 1080p
- H.264
- MP4
- audio 192 kbps

La sortie réelle dépend des flux proposés par la source.

#### Quality

Privilégie les flux de meilleure qualité lorsqu'ils existent.

Préférences possibles :

- haute résolution
- AV1
- WebM
- audio Opus

Le profil reste une préférence, pas une garantie.

Les plateformes tierces déterminent les flux réellement disponibles.

## Outils média

ZenithW inclut également des outils pour les fichiers locaux.

### Convert

Convert envoie un fichier local et le traite avec FFmpeg vers le format cible choisi.

Utile lorsqu'un fichier nécessite :

- un autre conteneur ;
- un autre format audio ;
- une meilleure compatibilité avec un appareil ;
- une sortie plus simple.

### Remux

Remux copie les flux audio et vidéo compatibles vers un autre conteneur sans les réencoder.

Cette méthode peut être nettement plus rapide qu'une conversion complète et évite une perte de qualité inutile.

Le remux fonctionne uniquement lorsque les flux source sont compatibles avec le conteneur cible.

Convert et Remux :

- affichent la progression ;
- renvoient des fichiers préparés temporaires ;
- ne servent pas de stockage cloud permanent ;
- respectent des limites serveur de taille et de traitement.

## Traitement sur l'appareil · Bêta

Convert et Remux proposent des modes expérimentaux de traitement local :

- **Server**
- **Prefer this device**
- **Only this device**

Le mode local peut copier des flux compatibles sans réencodage et extraire certains flux audio directement sur l'appareil.

### Server

Le traitement est effectué sur le backend ZenithW.

C'est le mode par défaut.

### Prefer this device

ZenithW essaie d'abord d'effectuer le traitement sur l'appareil.

Si cela échoue, une autorisation explicite est demandée avant l'envoi du fichier au serveur.

### Only this device

Le fichier n'est jamais envoyé au serveur ZenithW.

Si l'appareil ne peut pas effectuer l'opération, la tâche échoue localement.

### Limites actuelles

- Bureau : jusqu'à **64 MiB**
- Mobile / appareils à mémoire limitée : jusqu'à **24 MiB**
- Durée maximale : **30 minutes**

La bêta actuelle ne conserve pas :

- les sous-titres ;
- les chapitres ;
- les pièces jointes.

Les téléchargements par lien utilisent toujours le backend.

Voir :

[Documentation du traitement local](docs/LOCAL_MEDIA.md)

## Disponibilité de YouTube

Les téléchargements YouTube sont actuellement **désactivés sur le service public ZenithW**.

Il ne s'agit pas d'une panne normale de ZenithW.

YouTube peut appliquer des restrictions d'accès aux requêtes provenant d'infrastructures web hébergées, de serveurs cloud et de plages d'adresses IP de centres de données.

Le backend public de ZenithW étant hébergé sur une telle infrastructure, ses requêtes peuvent être traitées différemment de celles provenant d'une connexion résidentielle ou d'un navigateur classique.

Ainsi, YouTube peut refuser ou limiter une requête même si :

- ZenithW fonctionne correctement ;
- yt-dlp est opérationnel ;
- FFmpeg est disponible ;
- le backend est sain ;
- le pipeline média fonctionne normalement.

### Approches testées

Plusieurs solutions côté application ont été testées :

- cookies authentifiés actualisés ;
- renouvellement automatique des cookies ;
- services de rafraîchissement de cookies ;
- intégration PO Token ;
- services de génération de PO Token ;
- mises à jour de yt-dlp ;
- mises à jour des extracteurs ;
- ajustements de session ;
- ajustements des requêtes.

Certaines méthodes ont temporairement amélioré des cas isolés, mais aucune n'a fourni un accès suffisamment fiable pour le service public.

### Pourquoi les cookies et PO Tokens ne suffisent pas

Les cookies et PO Tokens peuvent aider dans certains cas, mais ils ne contrôlent pas tous les facteurs utilisés pour accepter ou refuser une requête.

YouTube peut également évaluer :

- la réputation de l'IP cloud ou datacenter ;
- l'origine de la requête ;
- l'état du compte ;
- l'état de session ;
- les exigences d'authentification ;
- les limites de débit ;
- les systèmes anti-abus ;
- les restrictions régionales ;
- les changements fréquents de la plateforme.

Un cookie ou PO Token valide ne garantit donc **pas** l'accès depuis un backend cloud public.

ZenithW ne présente pas ces mécanismes comme des contournements universels.

### Pourquoi YouTube a été désactivé sur le service public

Continuer à envoyer des requêtes via la même infrastructure provoquerait des échecs répétés sans expérience fiable.

Cela pourrait aussi accentuer la pression sur l'IP partagée du backend sans résoudre la restriction de fond.

Pour cette raison, l'accès YouTube a été désactivé volontairement sur le site public ZenithW.

### YouTube est-il supprimé définitivement ?

Non.

La prise en charge de YouTube n'a **pas été supprimée définitivement du projet ZenithW**.

Elle pourra revenir sur le service public si une solution fiable et maintenable devient disponible.

La limitation actuelle concerne spécifiquement le déploiement public hébergé.

### Auto-hébergement

Les installations auto-hébergées utilisent leur propre :

- adresse IP ;
- connexion réseau ;
- installation yt-dlp ;
- état d'authentification ;
- cookies ;
- configuration de token facultative.

Le comportement de YouTube peut donc différer de celui du service public.

L'auto-hébergement ne garantit pas non plus l'accès à YouTube.

La disponibilité dépend toujours des règles de YouTube et de l'environnement réseau.

## Disponibilité des plateformes

La prise en charge d'un site tiers doit être considérée comme best-effort.

Une tâche peut échouer pour des raisons hors du contrôle de ZenithW :

- média supprimé ;
- média privé ;
- restrictions d'âge ;
- connexion obligatoire ;
- restrictions régionales ;
- formats indisponibles ;
- limites de débit ;
- changements d'API ou de site ;
- systèmes anti-abus ;
- restrictions réseau ;
- contenu retiré.

ZenithW essaie de signaler ces limites au lieu de présenter une sortie indisponible comme réussie.

## Expérience utilisateur et confidentialité

ZenithW garde une interface légère :

- progression en direct ;
- annulation ;
- historique local au navigateur ;
- navigation responsive sur ordinateur ;
- navigation responsive sur mobile ;
- plusieurs langues ;
- aucun compte obligatoire.

Les fichiers préparés ne sont conservés que pendant une courte fenêtre de transfert.

Les liens de téléchargement sont :

- temporaires ;
- liés au client demandeur lorsque nécessaire ;
- supprimés automatiquement après utilisation ou expiration.

ZenithW n'est pas conçu comme un stockage média permanent en ligne.

### Historique local

L'historique de téléchargement est stocké dans le navigateur plutôt que dans un compte ZenithW.

Cela apporte du confort sans imposer d'inscription.

La suppression des données du navigateur peut également supprimer cet historique.

## Architecture

| Couche | Environnement |
|---|---|
| Frontend | HTML, CSS et JavaScript vanilla sur Cloudflare Pages |
| Edge | DNS, proxy, TLS et vérification d'origine Cloudflare |
| Backend | Flask, Gunicorn, gevent et Socket.IO sur Amazon EC2 |
| Média | yt-dlp, FFmpeg, Deno/EJS et intégrations de token facultatives |
| Gestion du service | Ubuntu, Nginx et systemd |

Le backend utilise volontairement **un seul worker**.

L'état des tâches, les rooms Socket.IO et la propriété des fichiers préparés sont locaux au processus.

Le passage à plusieurs workers ou réplicas nécessite d'abord un état et un stockage partagés.

## 🐳 Auto-hébergement avec Docker Compose

Le moyen le plus rapide d'exécuter ZenithW au complet est Docker Compose.

Il lance :

- le frontend ;
- le reverse proxy ;
- l'API ;
- FFmpeg ;
- l'espace de travail des téléchargements ;
- le stockage temporaire persistant.

L'installation par défaut conserve volontairement **un seul worker backend**.

```bash
git clone https://github.com/boranseason/zenithw.git
cd zenithw
cp .env.example .env
docker compose up -d --build
```

Puis ouvrez :

```text
http://localhost:8080
```

Si vous utilisez un autre port ou domaine public, modifiez ensemble dans `.env` :

- `ZENITHW_PORT`
- `SELF_HOSTED_ORIGIN`

Puis redémarrez :

```bash
docker compose up -d
```

## Stockage Docker

Le volume `zenithw-downloads` contient les fichiers temporaires de traitement.

Ils sont toujours supprimés par le nettoyage normal après expiration.

Le volume persistant sert surtout à éviter qu'une mise à jour de conteneur interrompe immédiatement un transfert actif.

Il ne doit pas être considéré comme un stockage média permanent.

## Cookies privés facultatifs

Certaines sources peuvent nécessiter une session navigateur connectée.

Un fichier de cookies privé peut être fourni à une installation auto-hébergée.

```bash
mkdir -p private
```

Placez votre export Netscape dans :

```text
private/cookies.txt
```

Puis :

```bash
cp compose.cookies.example.yml compose.cookies.yml
docker compose -f compose.yml -f compose.cookies.yml up -d
```

Les fichiers suivants ne doivent jamais être commités ou partagés publiquement :

```text
private/cookies.txt
compose.cookies.yml
```

Les cookies sont facultatifs et doivent rester privés.

Ils ne constituent pas un **contournement universel** des restrictions des plateformes tierces.

## Hébergement public

Pour un hébergement public, placez HTTPS ainsi qu'un pare-feu ou reverse proxy approprié devant le déploiement Docker.

Cloudflare est utilisé par l'infrastructure officielle de ZenithW, mais n'est pas obligatoire pour l'auto-hébergement.

## 🛠️ Développement local

### Prérequis

- Python 3.10+
- FFmpeg
- Navigateur moderne

Clonez le dépôt :

```bash
git clone https://github.com/boranseason/zenithw.git
cd zenithw/backend
```

Créez l'environnement virtuel :

```bash
python -m venv .venv
```

Activez-le avec la commande adaptée à votre système.

Installez ensuite les dépendances verrouillées :

```bash
pip install --require-hashes -r requirements.lock
```

Démarrez le backend :

```bash
python app.py
```

L'API démarre sur :

```text
http://localhost:5000
```

Servez `frontend/` avec n'importe quel serveur de fichiers statiques.

Le CORS de développement ne doit être activé que pour le développement local cross-origin.

## 🔐 Essentiels de production

Les déploiements de production exigent des valeurs privées fortes pour :

```text
SECRET_KEY
ORIGIN_SECRET
```

Les limites d'exécution, budgets de fichiers temporaires, règles de proxy, limites de concurrence et accès aux diagnostics sont configurés via les variables d'environnement documentées dans le backend.

Règles importantes :

- Gardez les secrets hors de Git.
- Gardez les cookies exportés hors de Git.
- Gardez les données privées du navigateur privées.
- Protégez l'origine EC2 derrière la chaîne de proxy configurée.
- Vérifiez le secret d'origine partagé lorsqu'il est utilisé.
- Ne faites confiance aux en-têtes visiteurs qu'à travers une infrastructure proxy de confiance.
- Gardez les diagnostics privés.
- Gardez les réponses health publiques minimales.
- N'augmentez pas le nombre de workers avant d'avoir mis en place un état partagé et une coordination des fichiers.

## Endpoints principaux

| Endpoint | Rôle |
|---|---|
| `POST /info` | Résoudre les métadonnées et formats |
| `POST /download` | Démarrer un téléchargement ou une extraction |
| `POST /convert` | Convertir ou remuxer un fichier envoyé |
| `POST /cancel` | Annuler une tâche active |
| `GET /files/<token>` | Transférer un fichier préparé temporaire |
| `GET /health` | Réponse minimale de disponibilité |
| `GET /ready` | État des dépendances et de la capacité |

## Sécurité

ZenithW impose des limites au traitement distant des médias au lieu de considérer toute entrée internet comme fiable.

Les protections comprennent notamment :

- validation des cibles distantes ;
- blocage des destinations privées ;
- blocage des destinations link-local ;
- contraintes de redirection ;
- restrictions de protocoles média ;
- limites de concurrence ;
- limites de traitement ;
- limites d'utilisation disque ;
- expiration des fichiers temporaires ;
- tokens de fichiers à courte durée de vie ;
- livraison restreinte des fichiers préparés.

Aucun service internet ne peut garantir un anonymat absolu, une disponibilité illimitée ou une protection totale contre les changements des plateformes tierces.

ZenithW cherche plutôt à minimiser les données conservées et à limiter la durée et la portée des traitements temporaires.

## Utilisation responsable

Utilisez ZenithW uniquement pour des contenus :

- qui vous appartiennent ;
- que vous êtes autorisé à télécharger ;
- que vous pouvez utiliser légalement.

Les conditions des plateformes tierces et les règles de droit d'auteur applicables restent sous la responsabilité de l'utilisateur.

ZenithW n'est affilié ni à YouTube, TikTok, Instagram, X, Reddit ni aux autres plateformes prises en charge.

La prise en charge d'une plateforme n'implique aucun partenariat, soutien ou intégration officielle.

## Signalement de bugs

Les bugs reproductibles peuvent être signalés via :

[GitHub Issues](https://github.com/boranseason/zenithw/issues)

Lors d'un signalement :

- décrivez clairement le problème ;
- fournissez des étapes de reproduction si possible ;
- indiquez la version ZenithW concernée ;
- ajoutez les informations d'erreur utiles ;
- retirez les informations privées ou identifiantes.

N'incluez jamais publiquement :

- cookies ;
- mots de passe ;
- URL privées ;
- tokens d'authentification ;
- secrets API ;
- données personnelles.

## Licence

- **ZenithW :** AGPL-3.0-only
- **Dépendances tierces :** leurs licences respectives
- Détails : [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
