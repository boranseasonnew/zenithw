# ZenithW

> Ein fokussierter, werbefreier Medien-Arbeitsbereich zum Herunterladen, Konvertieren und Remuxen von Inhalten, die du verwenden darfst. ✨

[Live-App](https://zenithw.space) · [Status](https://zenithw.space/status) · [Updates](https://zenithw.space/updates) · [English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [日本語](README.ja.md)

Aktuelle Version: **v14.4**

![ZenithW web interface](docs/assets/zenithw-preview.png)

## ✨ Warum ZenithW?

ZenithW hält Medienarbeit ruhig und nachvollziehbar: Link einfügen, prüfen, was die Quelle wirklich anbietet, eine sinnvolle Ausgabe wählen und die vorbereitete Datei speichern. Kein Konto, keine Erweiterung, keine Paywall und keine Werbung im Ablauf — nur praktische Werkzeuge und klare Grenzen.

- **Ein fokussierter Arbeitsbereich** für Downloads, Audio-Extraktion, Konvertierung und Remux.
- **Datenschutzfreundlich:** Verlauf bleibt im Browser, vorbereitete Dateien laufen ab.
- **Ehrliche Einstellungen:** Ein Profil ist eine Präferenz, kein Versprechen für jedes Format jeder Quelle.
- **Bereit zum Selbst-Hosting:** Docker Compose startet Oberfläche und API zusammen auf dem eigenen Rechner oder Server. 🐳

## Funktionen

- Löst Medien von YouTube, TikTok, Instagram, X, Reddit und weiteren yt-dlp-kompatiblen Quellen auf.
- Lädt Video, Audio, stumme Videos, Playlists und kleine Link-Sammlungen herunter.
- Konvertiert mit FFmpeg und remuxt kompatible Streams ohne unnötige Neukodierung.
- Unterstützt Untertitel, Metadaten, Vorschaubilder, SponsorBlock, Abbruch und Live-Fortschritt.
- Speichert den Verlauf im Browser statt in einem serverseitigen Konto.
- Bietet eine responsive, frameworkfreie Oberfläche auf Türkisch, Englisch, Französisch, Deutsch und Japanisch.

ZenithW folgt einem kurzen, nachvollziehbaren Ablauf: Füge einen unterstützten Link ein, prüfe Mediendetails und Optionen und bereite anschließend eine Datei für den direkten Browser-Download vor. Konto, Browser-Erweiterung und Desktop-Client sind nicht erforderlich. Die Oberfläche bleibt bewusst kompakt und zeigt dennoch die Entscheidungen, die für einen Medienauftrag wichtig sind.

## Download-Steuerung

Der Startbildschirm unterstützt automatische Auswahl, Audio-Extraktion, stummes Video, Playlist-Verarbeitung und kleine Link-Sammlungen. Wenn eine Quelle mehrere Formate anbietet, lassen sich Container, Auflösung, Codec-Präferenz, Audio-Bitrate, Untertitel, Metadaten, Vorschaubild, Dateinamensmuster und SponsorBlock-Verhalten vor dem Start wählen.

Die Einstellungen enthalten drei praktische Download-Profile:

- **Minimal** bevorzugt kleinere, breit kompatible Dateien für schnelles Teilen und begrenzten Speicher.
- **Standard** zielt auf ausgewogenes 1080p-H.264/MP4-Video und 192-kbps-Audio.
- **Qualität** bevorzugt hochauflösendes AV1/WebM-Video mit Opus-Audio, sofern die Quelle es bereitstellt.

Ein Profil ist ein Ausgangspunkt, keine Zusage für jeden Stream. Bei YouTube-Videoaufträgen erzwingt der Server unter Last eine Obergrenze von 720p und erlaubt bis zu 1080p nur im Leerlauf. Format-Fallbacks können die Grenze nicht unbemerkt überschreiten; die Dimensionen des gewählten Videostreams werden gegen das wirksame Limit geprüft. Audio-Downloads und andere Quellen behalten ihren eigenen Auswahlablauf.

## Medienwerkzeuge

ZenithW bietet zusätzlich zu Link-Downloads zwei Werkzeuge für lokale Dateien:

- **Konvertieren** lädt eine Datei für eine begrenzte FFmpeg-Konvertierung in ein ausdrücklich gewähltes Zielformat hoch.
- **Remux** kopiert kompatible Audio- und Videostreams ohne Neukodierung in einen neuen Container. Das ist schneller und vermeidet unnötigen Qualitätsverlust, funktioniert aber nur bei kompatiblen Streams.

Beide Werkzeuge zeigen ihren Verarbeitungszustand und geben eine kurzlebige vorbereitete Datei zurück, statt Uploads zu archivieren. Upload-Größe, Ausgabegröße, Dauer, Parallelität und Verarbeitungszeit sind serverseitig begrenzt.

### Verarbeitung auf dem Gerät · Beta

Convert und Remux bieten **Server**, **Dieses Gerät bevorzugen** und **Nur dieses Gerät**. Die Beta kopiert kompatible Audio-/Videospuren ohne Neukodierung und kann Medien umverpacken oder kompatible Audiospuren extrahieren. Standard bleibt der Server. Nach einem lokalen Fehler ist eine ausdrückliche Upload-Bestätigung erforderlich; Nur dieses Gerät lädt niemals Dateien hoch. Grenzen: 64 MiB am Desktop, 24 MiB auf mobilen/speicherarmen Geräten und 30 Minuten. Untertitel, Kapitel und Anhänge bleiben nicht erhalten. Link-Downloads verwenden weiterhin das Backend. [Umfang, Grenzen und Build-Anleitung](docs/LOCAL_MEDIA.md) auf Englisch.

## YouTube-Verfügbarkeit

YouTube-Downloads werden nach dem Best-Effort-Prinzip angeboten. YouTube kann zeitweise strengere Prüfungen anwenden oder Anfragen aus Rechenzentrums-IP-Bereichen blockieren, einschließlich Cloud-Servern wie AWS. Dann kann ein Ergebnis wie ein Download-Fehler aussehen, obwohl ZenithW und die Download-Pipeline normal funktionieren.

Keine Änderung innerhalb der Anwendung kann ununterbrochenen YouTube-Zugang garantieren, wenn der Upstream eine Server-IP einschränkt. Das bedeutet nicht, dass die YouTube-Unterstützung entfernt wurde. Downloads bleiben aktiviert, während wir die Lage beobachten und auf eine sinnvolle Verbesserung auf Upstream- oder Netzwerkebene warten.

ZenithW bündelt gleichzeitige Metadatenabfragen für denselben Link, verwendet einen kurzlebigen Cache, getrennte YouTube-Budgets pro Besucher und Host, unterdrückt doppelte Starts und pausiert nach echten HTTP-429-Antworten weitere Upstream-Versuche. Das reduziert unnötigen Traffic, kann aber YouTubes Zugriffsentscheidungen nicht außer Kraft setzen.

ZenithW kann nicht immer einen unterbrechungsfreien Download-Dienst bieten; YouTube-Verfügbarkeit ist nicht jederzeit garantiert. Privatsphäre-Einstellungen, regionale Einschränkungen, gelöschte Inhalte, Anmeldepflichten und Plattform-Limits liegen außerhalb der Kontrolle von ZenithW.

## Benutzererlebnis und Datenschutz

ZenithW bietet ohne Benutzerkonto Live-Fortschritt, Abbruch, browserlokalen Verlauf, responsive Desktop- und Mobilnavigation sowie Sprachunterstützung. Der Server bereitet Dateien nur für das Übertragungsfenster vor. Vorbereitete Download-Links sind kurzlebig, an den anfragenden Client gebunden und werden nach Nutzung oder Ablauf entfernt.

Keine Funktion garantiert, dass eine Drittplattform ein bestimmtes Format bereitstellt oder jede Anfrage akzeptiert. ZenithW meldet solche Grenzen, statt nicht verfügbare Ausgaben als abgeschlossen darzustellen.

## Architektur

| Ebene | Laufzeit |
|---|---|
| Frontend | Vanilla HTML, CSS und JavaScript auf Cloudflare Pages |
| Edge | Cloudflare DNS, Proxy, TLS und Origin-Verifizierung |
| Backend | Flask, Gunicorn, gevent und Socket.IO auf Amazon EC2 (AWS) |
| Medien | yt-dlp, FFmpeg, Deno/EJS und ein optionaler PO-Token-Anbieter |
| Dienstverwaltung | Ubuntu, Nginx und systemd |

Das Backend läuft bewusst mit **einem Worker**. Auftragsstatus, Socket.IO-Räume und vorbereitete Dateien sind prozesslokal; zusätzliche Worker oder Replikate brauchen zuerst gemeinsame Koordination und Speicherung.

## 🐳 Selbst hosten mit Docker Compose

Docker Compose ist der schnellste Weg zu einer vollständigen Installation. Frontend, Reverse Proxy, API, FFmpeg und ein persistentes Download-Volume laufen zusammen. Die Standardinstallation bleibt bewusst bei **einem Backend-Worker**; das passt zum aktuellen prozesslokalen Modell für Jobs, Fortschritt, Abbruch und vorbereitete Dateien.

```bash
git clone https://github.com/boranseason/zenithw.git
cd zenithw
cp .env.example .env
docker compose up -d --build
```

Öffne `http://localhost:8080`. Wenn du einen anderen Port oder eine öffentliche Domain nutzt, ändere `ZENITHW_PORT` und `SELF_HOSTED_ORIGIN` gemeinsam in `.env` und starte danach `docker compose up -d` erneut.

Das Docker-Volume `zenithw-downloads` hält temporäre Verarbeitungsdateien. Die normale Ablaufbereinigung von ZenithW entfernt sie weiterhin; das Volume verhindert vor allem, dass ein Container-Update ein aktives Übertragungsfenster unnötig unterbricht.

### Optionale private Cookies

Einige Quellen können eine angemeldete Browsersitzung verlangen. Diese Option ist freiwillig und muss privat bleiben:

```bash
mkdir -p private
# Lege deinen eigenen Netscape-Export in private/cookies.txt ab.
cp compose.cookies.example.yml compose.cookies.yml
docker compose -f compose.yml -f compose.cookies.yml up -d
```

`private/cookies.txt` und `compose.cookies.yml` dürfen niemals committed oder geteilt werden. ZenithW funktioniert ohne diese Ergänzung; sie ist kein universeller Umweg um Plattformbeschränkungen.

Für eine öffentliche Bereitstellung sollten HTTPS und eine Firewall oder ein Reverse Proxy vor Docker liegen. Cloudflare ist für die offizielle Bereitstellung nützlich, aber für Self-Hosting **nicht erforderlich**.

## 🛠️ Lokale Entwicklung

Voraussetzungen: Python 3.10+, FFmpeg und ein moderner Browser.

```bash
git clone https://github.com/boranseason/zenithw.git
cd zenithw/backend
python -m venv .venv
```

Aktiviere die Umgebung und führe anschließend Folgendes aus:

```bash
pip install --require-hashes -r requirements.lock
python app.py
```

Die API startet auf `http://localhost:5000`. Stelle `frontend/` mit einem statischen Dateiserver bereit. Aktiviere Entwicklungs-CORS nur für lokale Cross-Origin-Arbeit, niemals in Produktion.

## 🔐 Wichtige Punkte für Produktion

Für die Produktion werden starke private Werte für `SECRET_KEY` und `ORIGIN_SECRET` benötigt. Laufzeitlimits, vertrauenswürdige Proxys, Budgets für temporäre Dateien und Diagnosezugriff werden über die in `backend/app.py` dokumentierten Umgebungsvariablen konfiguriert.

- Halte Geheimnisse und exportierte Browserdaten aus Git heraus.
- Halte den EC2-Origin hinter Cloudflare und prüfe den gemeinsamen Origin-Header.
- Vertraue Besucher-Headern nur über die Cloudflare-zu-Nginx-Proxykette.
- Halte Diagnosen privat und öffentliche Liveness-Antworten minimal.
- Skaliere nicht über einen Worker hinaus, bevor Auftragsstatus, Socket.IO-Routing und vorbereitete Dateien sicher geteilt werden.

## Wichtige Endpunkte

| Endpunkt | Zweck |
|---|---|
| `POST /info` | Metadaten und Formate auflösen |
| `POST /download` | Download- oder Extraktionsauftrag starten |
| `POST /convert` | Eine hochgeladene Datei konvertieren oder remuxen |
| `POST /cancel` | Einen aktiven Auftrag abbrechen |
| `GET /files/<token>` | Eine kurzlebige vorbereitete Datei übertragen |
| `GET /health` | Minimale Liveness-Antwort |
| `GET /ready` | Bereitschaft von Abhängigkeiten und Kapazität |

## Sicherheit und verantwortungsvolle Nutzung

ZenithW validiert entfernte Ziele, blockiert private und Link-Local-Ziele, begrenzt Weiterleitungen und Medienwerkzeug-Protokolle, beschränkt Parallelität und Festplattennutzung und liefert vorbereitete Dateien über kurzlebige Tokens aus. Kein Internetdienst kann absolute Anonymität oder ununterbrochene Verfügbarkeit versprechen.

Nutze ZenithW nur für Inhalte, die dir gehören, für deren Download du berechtigt bist oder die du rechtmäßig verwenden darfst. Bedingungen der Quellplattformen und Urheberrechtsregeln bleiben Verantwortung der Nutzer. ZenithW ist mit den unterstützten Plattformen nicht verbunden.

Melde reproduzierbare Fehler über [GitHub Issues](https://github.com/boranseason/zenithw/issues). Nenne in öffentlichen Meldungen niemals Geheimnisse, private Links oder personenbezogene Daten.

## Lizenz

- ZenithW: AGPL-3.0-only
- Drittanbieter-Abhängigkeiten: ihre jeweiligen Lizenzen
- Details: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
