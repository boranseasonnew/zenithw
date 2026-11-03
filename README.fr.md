<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Enregistrez vos médias. En toute simplicité.<br>
  <a href="https://zenithw.space">Application web</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.0-7C3AED?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.0"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=electron&amp;color=2563EB" alt="Windows latest release"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw-android?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android&amp;logo=android&amp;color=2E7D32" alt="Android latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0--only-64748B?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white" alt="AGPL-3.0-only license"></a>
</p>

<p align="center">
  <a href="https://github.com/boranseasonnew/zenithw/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=PC%20downloads&amp;logo=github&amp;color=7C3AED" alt="PC GitHub release asset downloads, all releases"></a>
  <a href="https://github.com/boranseasonnew/zenithw-android/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw-android/total?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Android%20downloads&amp;logo=android&amp;color=2E7D32" alt="Android GitHub release asset downloads, all releases"></a>
</p>

<p align="center"><sub>Les compteurs totalisent les téléchargements de fichiers de toutes les publications GitHub, pas les utilisateurs uniques ni les installations Microsoft Store.</sub></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

Web v17.0 · ZenithW Desktop v4.2.0 · Android v3.0.0

[Zenith Type](https://zenithw.space/typing) propose des exercices de frappe et des duels. Le mode classé comprend une limite de 50 000 Elo, des revanches acceptées par les deux joueurs et un historique avec le bilan de leurs rencontres. Un compte est nécessaire pour jouer en ligne. Consultez les règles et le statut de publication dans la [documentation](docs/TYPING.md). Le classement WPM et les points Elo des duels classés sont réinitialisés tous les 30 jours, avec un compte à rebours de saison. L’hôte peut modifier les paramètres d’une salle privée avant le match. L’aide à la frappe réservée au propriétaire peut être activée en jeu. Les salles privées ont un Elo distinct et permanent, visible sur le profil et sans effet sur le classement.

ZenithW est un outil multimédia open source pour télécharger des vidéos et des fichiers audio, extraire le son, convertir et remuxer. Sans publicité, abonnement ni compte obligatoire.

Collez un lien pris en charge, choisissez un format et téléchargez le fichier. Les formats disponibles dépendent de la source.

## Les nouveautés du web 17.0

- Un [séparateur audio](https://zenithw.space/audio-separator) plus réactif : formes d’onde par petites tâches, mémoire de lecture à la demande et exports WAV/ZIP annulables. MP3 et FLAC restent disponibles.
- Le [remux](https://zenithw.space/remux) permet de choisir le conteneur avant de lancer, notamment MKV ↔ MP4 pour les pistes compatibles. Les codecs incompatibles nécessitent une conversion.
- Des explications et métadonnées de recherche plus claires dans les huit langues du site, avec des liens de navigation corrigés.
- Des dépendances actualisées, une durée totale limitée pour les miniatures et une protection contre les changements d’avatar Type simultanés. Serveur et applications nécessitent leurs propres déploiements.

Le séparateur fonctionne sur votre appareil : jusqu’à 96 MiB et un extrait de quatre minutes, avec téléchargement initial du modèle. La vitesse dépend de l’appareil. Windows et Android conservent leurs versions distinctes.

[Notes de version](https://zenithw.space/updates) · [Rapport de sécurité et de validation — anglais](docs/full-code-audit-2026-11-02.md)

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
