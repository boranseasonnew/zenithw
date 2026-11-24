<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="Логотип ZenithW">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Сохраняйте медиа. Без лишних сложностей.<br>
  <a href="https://zenithw.space/ru/">Веб-приложение</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
</p>

<p align="center">
  <a href="https://zenithw.space"><img src="https://img.shields.io/badge/Web-v17.2-7C3AED?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;logo=html5" alt="ZenithW Web v17.2"></a>
  <a href="https://github.com/boranseasonnew/zenithw/releases/latest"><img src="https://img.shields.io/github/v/release/boranseasonnew/zenithw?style=for-the-badge&amp;labelColor=151922&amp;logoColor=white&amp;label=Windows&amp;logo=windows11&amp;color=2563EB" alt="Windows latest release"></a>
</p>

<p align="center"><strong><a href="why_zenithw.md">✦ Почему ZenithW? История проекта (на английском)</a></strong></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

ZenithW — открытый инструмент для загрузки видео и аудио, извлечения звука, конвертации и смены контейнера без перекодирования. Без рекламы, подписки и обязательной регистрации для меди-инструментов.

Вставьте поддерживаемую ссылку, выберите формат и скачайте файл. Доступные форматы зависят от источника.

[Zenith Type](https://zenithw.space/typing) предлагает тренировку печати на турецком/английском, профили, проверенные рейтинги, рейтинговые дуэли и приватные комнаты. Для онлайн-функций нужна учётная запись; для локальной тренировки — нет. Рейтинги WPM и Elo рейтинговых дуэлей сбрасываются каждые 30 дней. Приватный Elo хранится отдельно и не сбрасывается. Правила, настройки комнат и статус развёртывания описаны в [документации Type](docs/TYPING.md).

## Почему ZenithW?

Открытая медиаплатформа для скачивания и обработки файлов без обязательной учётной записи, подписки и рекламы.

## Возможности

- Скачивание медиа из поддерживаемых источников по простой ссылке.
- Извлечение и обработка аудио из медиафайлов.
- Преобразование форматов и remux совместимых потоков MKV/MP4 без перекодирования.
- Локальное преобразование и изменение размера изображений в браузере.
- Разделение вокала и инструментала с помощью Audio Separator.

## Быстрый старт

Клонируйте репозиторий и перейдите в каталог проекта:

```bash
git clone https://github.com/boranseasonnew/zenithw.git
cd zenithw
cp .env.example .env
```

Скопируйте `.env.example` в `.env` и задайте для `SECRET_KEY` надёжное случайное значение.

```bash
docker compose up -d --build
```

Откройте `http://localhost:8080` в браузере:

## Что нового в веб-версии 17.2

- **Новый [конвертер изображений](https://zenithw.space/ru/image-convert):** преобразование между форматами JPEG, PNG, WebP, AVIF, TIFF, BMP, TGA, QOI и другими. Локальный движок поддерживает дополнительные форматы.
- **Точное изменение размера:** задавайте собственную ширину и высоту, просматривайте результат и контролируйте размеры выходного изображения.
- **Обновлённый [разделитель аудио](https://zenithw.space/ru/audio-separator):** новый интерфейс студии упрощает выбор файлов, работу с вокальной и инструментальной дорожками, предварительное прослушивание и экспорт.
- **Восемь языков:** интерфейс конвертера и подписи доступности переведены на все восемь языков сайта. Конвертация и изменение размера выполняются локально в браузере.
- Остальные инструменты остаются доступны, включая remux совместимых потоков MKV/MP4 без повторного кодирования.

У Windows и Android собственная нумерация версий; здесь указана версия веб-приложения.

## Проект

- [Веб-интерфейс](frontend/) и [API](backend/)
- [Приложение Windows](desktop/) · [Исходный код Android](https://github.com/boranseasonnew/zenithw-android)

## Документация

- [Использование и ограничения — английский](docs/USAGE.md)
- [Самостоятельное размещение и разработка — английский](docs/SELF_HOSTING.md)
- [Обработка медиа на устройстве — английский](docs/LOCAL_MEDIA.md)
- [Состояние сервиса](https://zenithw.space/status) · [Обновления](https://zenithw.space/ru/updates)

Загрузка с YouTube отключена в публичном веб-сервисе. Windows, Android и самостоятельно размещённые установки используют собственное соединение; ограничения источников по-прежнему действуют.

## Ответственное использование

Загружайте только свой контент или материалы, которые вам разрешено использовать. Соблюдайте условия платформ и авторские права. ZenithW не связан с поддерживаемыми платформами.

История веб-загрузок хранится в браузере; подготовленные файлы на сервере удаляются по истечении срока хранения. ZenithW не является постоянным облачным хранилищем.

## Участие

Приветствуются сообщения об ошибках, переводы и pull request. Прочитайте [руководство для участников](CONTRIBUTING.md) или создайте [issue](https://github.com/boranseasonnew/zenithw/issues).

## Благодарности

Проект использует yt-dlp, FFmpeg, Mediabunny и другие открытые компоненты. Спасибо их разработчикам и всем участникам ZenithW.

## Лицензия

[AGPL-3.0-only](LICENSE). Сторонние компоненты сохраняют собственные лицензии; см. [уведомления](THIRD_PARTY_NOTICES.md).
