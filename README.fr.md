<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Enregistrez vos médias. En toute simplicité.<br>
  <a href="https://zenithw.space">Application web</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.2-7C3AED?style=flat-square&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.2"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw/total?style=flat-square&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows%20downloads&amp;logo=windows11&amp;color=2563EB" alt="Windows GitHub release downloads"></a>
</p>

<p align="center"><strong><a href="why_zenithw.md">✦ Pourquoi ZenithW ? Découvrir son histoire (anglais)</a></strong></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

[Zenith Type](https://zenithw.space/typing) propose des exercices de frappe et des duels. Le mode classé comprend une limite de 50 000 Elo, des revanches acceptées par les deux joueurs et un historique avec le bilan de leurs rencontres. Un compte est nécessaire pour jouer en ligne. Consultez les règles et le statut de publication dans la [documentation](docs/TYPING.md). Le classement WPM et les points Elo des duels classés sont réinitialisés tous les 30 jours, avec un compte à rebours de saison. L’hôte peut modifier les paramètres d’une salle privée avant le match. L’aide à la frappe réservée au propriétaire peut être activée en jeu. Les salles privées ont un Elo distinct et permanent, visible sur le profil et sans effet sur le classement.

ZenithW est un outil multimédia open source pour télécharger des vidéos et des fichiers audio, extraire le son, convertir et remuxer. Sans publicité, abonnement ni compte obligatoire.

Collez un lien pris en charge, choisissez un format et téléchargez le fichier. Les formats disponibles dépendent de la source.

## Pourquoi ZenithW ?

Un espace multimédia open source pour télécharger et traiter des médias sans compte obligatoire, abonnement ni publicité.

## Fonctionnalités

- Téléchargez des médias depuis les sources prises en charge avec un simple lien.
- Extrayez et traitez l’audio de vos médias.
- Convertissez les formats et remuxez les flux MKV/MP4 compatibles sans réencodage.
- Convertissez et redimensionnez des images localement dans votre navigateur.
- Séparez les voix et les instrumentaux avec le séparateur audio.

## Démarrage rapide

Clonez le dépôt et ouvrez le dossier du projet :

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw
cp .env.example .env
```

Copiez `.env.example` vers `.env`, puis définissez `SECRET_KEY` avec une valeur aléatoire robuste.

```bash
docker compose up -d --build
```

Ouvrez `http://localhost:8080` dans votre navigateur :

## Nouveautés du Web 17.2

- **Nouveau [convertisseur d’images](https://zenithw.space/fr/image-convert) :** convertissez entre plusieurs formats, notamment JPEG, PNG, WebP, AVIF, TIFF, BMP, TGA et QOI. Le moteur local prend en charge d’autres formats.
- **Redimensionnement précis :** saisissez une largeur et une hauteur personnalisées, prévisualisez le résultat et gardez le contrôle des dimensions de sortie.
- **[Séparateur audio](https://zenithw.space/fr/audio-separator) repensé :** une interface studio renouvelée clarifie le choix des fichiers, l’utilisation des pistes voix et instrumentale, l’aperçu et l’export.
- **Huit langues :** l’interface du convertisseur et ses libellés d’accessibilité sont traduits dans les huit langues du site. La conversion et le redimensionnement s’effectuent localement dans le navigateur.
- Les outils existants restent disponibles, notamment le remux des flux MKV/MP4 compatibles sans réencodage.

Windows et Android conservent leurs propres numéros de version ; cette version concerne le Web.

## Projet

- [Interface web](frontend/) et [API](backend/)
- [Application Windows](desktop/) · [Code source Android](https://github.com/boranseasonnew/zenithw-android)

## Documentation

- [Utilisation et limites — en anglais](docs/USAGE.md)
- [Auto-hébergement et développement — en anglais](docs/SELF_HOSTING.md)
- [Traitement multimédia sur l’appareil — en anglais](docs/LOCAL_MEDIA.md)
- [État du service](https://zenithw.space/status) · [Mises à jour](https://zenithw.space/updates)

Le téléchargement depuis YouTube est désactivé sur le service web public. Les applications Windows, Android et les installations auto-hébergées utilisent leur propre connexion ; les restrictions des sources restent applicables.

## Utilisation responsable

Téléchargez uniquement les contenus qui vous appartiennent ou que vous êtes autorisé à utiliser. Respectez les conditions des plateformes et les droits d’auteur. ZenithW n’est pas affilié aux plateformes prises en charge.

L’historique web reste dans votre navigateur ; les fichiers préparés expirent sur le serveur. ZenithW n’est pas un service de stockage cloud permanent.

## Contribuer

Les signalements de bugs, traductions et pull requests sont les bienvenus. Consultez le [guide de contribution](CONTRIBUTING.md) ou ouvrez une [issue](https://github.com/boranseasonnew/zenithw/issues).

## Merci

Créé avec yt-dlp, FFmpeg, Mediabunny et d’autres projets open source. Merci à leurs équipes et à toutes les personnes qui contribuent à ZenithW.

## Licence

[AGPL-3.0-only](LICENSE). Les composants tiers conservent leurs propres licences ; consultez les [mentions tierces](THIRD_PARTY_NOTICES.md).
