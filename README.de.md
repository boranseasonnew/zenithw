<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="ZenithW logo">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Medien speichern. Einfach bleiben.<br>
  <a href="https://zenithw.space">Web-App</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.2-7C3AED?style=flat-square&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.2"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases"><img src="https://img.shields.io/github/downloads/boranseasonnew/zenithw/total?style=flat-square&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows%20downloads&amp;logo=windows11&amp;color=2563EB" alt="Windows GitHub release downloads"></a>
</p>

<p align="center"><strong><a href="why_zenithw.md">✦ Warum ZenithW? Die Geschichte lesen (Englisch)</a></strong></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

[Zenith Type](https://zenithw.space/typing) bietet Tipptraining und Duelle. Ranglistenspiele unterstützen bis zu 50.000 Elo, beidseitig bestätigte Rückspiele und einen Spielverlauf mit direkten Vergleichswerten. Für das Online-Spiel ist ein Konto erforderlich. Regeln und Veröffentlichungsstatus stehen in der [Dokumentation](docs/TYPING.md). Die WPM-Rangliste und Elo der Ranglistenduelle werden alle 30 Tage zurückgesetzt; ein Countdown zeigt die verbleibende Saisonzeit. Gastgeber können private Räume vor dem Spiel konfigurieren. Die nur für den Besitzer verfügbare Tastenhilfe lässt sich während des Spiels umschalten. Private Räume haben einen separaten, dauerhaften Elo-Wert im Profil, ohne Einfluss auf die Rangliste.

ZenithW ist ein quelloffenes Medienwerkzeug zum Herunterladen von Videos und Audio sowie zum Extrahieren, Konvertieren und Remuxen. Ohne Werbung, Abonnement oder verpflichtendes Konto.

Unterstützten Link einfügen, Format wählen und Datei herunterladen. Verfügbare Formate hängen von der Quelle ab.

## Warum ZenithW?

Ein Open-Source-Medienarbeitsbereich zum Herunterladen und Verarbeiten von Medien ohne Pflichtkonto, Abonnement oder Werbung.

## Funktionen

- Medien aus unterstützten Quellen über einen einfachen Link-Workflow herunterladen.
- Audio aus Medien extrahieren und bearbeiten.
- Medienformate konvertieren und kompatible MKV/MP4-Streams ohne erneute Codierung remuxen.
- Bilder direkt im Browser lokal konvertieren und skalieren.
- Mit dem Audio Separator Gesang und Instrumente trennen.

## Schnellstart

Repository klonen und in das Projektverzeichnis wechseln:

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw
cp .env.example .env
```

`.env.example` nach `.env` kopieren und `SECRET_KEY` durch einen starken, zufälligen Wert ersetzen.

Dienste erstellen und starten, dann `http://localhost:8080` öffnen.

## Neu in Web 17.2

- **Neuer [Bildkonverter](https://zenithw.space/de/image-convert):** Bilder zwischen Formaten wie JPEG, PNG, WebP, AVIF, TIFF, BMP, TGA und QOI konvertieren. Die lokale Engine unterstützt weitere Formate.
- **Bilder präzise skalieren:** eigene Breite und Höhe eingeben, das Ergebnis in der Vorschau prüfen und die Ausgabemaße kontrollieren.
- **Überarbeiteter [Audiotrenner](https://zenithw.space/de/audio-separator):** eine erneuerte Studio-Oberfläche vereinfacht Dateiauswahl, getrennte Gesangs- und Instrumentalspuren, Vorschau und Export.
- **Acht Sprachen:** Oberfläche und Barrierefreiheitstexte des Bildkonverters sind in allen acht Website-Sprachen verfügbar. Konvertierung und Skalierung erfolgen lokal im Browser.
- Bestehende Medienwerkzeuge bleiben verfügbar, darunter Remux kompatibler MKV-/MP4-Streams ohne erneute Codierung.

Windows und Android behalten ihre eigenen Versionsnummern; diese Versionsangabe bezieht sich auf das Web.

## Projekt

- [Weboberfläche](frontend/) und [API](backend/)
- [Windows-App](desktop/) · [Android-Quellcode](https://github.com/boranseasonnew/zenithw-android)

## Dokumentation

- [Nutzung und Grenzen — auf Englisch](docs/USAGE.md)
- [Selbst hosten und entwickeln — auf Englisch](docs/SELF_HOSTING.md)
- [Medienverarbeitung auf dem Gerät — auf Englisch](docs/LOCAL_MEDIA.md)
- [Dienststatus](https://zenithw.space/status) · [Updates](https://zenithw.space/updates)

YouTube-Downloads sind im öffentlichen Webdienst deaktiviert. Windows, Android und selbst gehostete Installationen verwenden ihre eigene Verbindung; Einschränkungen der Quellen gelten weiterhin.

## Verantwortungsvolle Nutzung

Laden Sie nur Inhalte herunter, die Ihnen gehören oder die Sie verwenden dürfen. Beachten Sie Plattformbedingungen und Urheberrechte. ZenithW ist nicht mit den unterstützten Plattformen verbunden.

Der Web-Downloadverlauf bleibt im Browser; vorbereitete Dateien auf dem Server laufen ab. ZenithW ist kein dauerhafter Cloudspeicher.

## Mitmachen

Fehlerberichte, Übersetzungen und Pull Requests sind willkommen. Lesen Sie den [Beitragsleitfaden](CONTRIBUTING.md) oder öffnen Sie ein [Issue](https://github.com/boranseasonnew/zenithw/issues).

## Danke

Entwickelt mit yt-dlp, FFmpeg, Mediabunny und weiteren Open-Source-Projekten. Danke an deren Entwickler und alle, die zu ZenithW beitragen.

## Lizenz

[AGPL-3.0-only](LICENSE). Drittanbieterkomponenten behalten ihre eigenen Lizenzen; siehe [Drittanbieterhinweise](THIRD_PARTY_NOTICES.md).
