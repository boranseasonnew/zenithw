<p align="center">
  <img src="frontend/zenithw.png" width="96" height="96" alt="Логотип ZenithW">
</p>

<h1 align="center">ZenithW</h1>

<p align="center">
  Сохраняйте медиа. Без лишних сложностей.<br>
  <a href="https://zenithw.space/ru/">Веб-приложение</a> · <a href="https://github.com/boranseasonnew/zenithw/releases/latest">Windows</a> · <a href="https://github.com/boranseasonnew/zenithw-android/releases/latest">Android</a>
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

<p align="center"><sub>Счётчики суммируют загрузки файлов всех выпусков GitHub, а не уникальных пользователей или установки из Microsoft Store.</sub></p>

[English](README.md) · [Türkçe](README.tr.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh.md) · [日本語](README.ja.md)

Web v17.0 · ZenithW Desktop v4.2.0 · Android v3.1.1

ZenithW — открытый инструмент для загрузки видео и аудио, извлечения звука, конвертации и смены контейнера без перекодирования. Без рекламы, подписки и обязательной регистрации для меди-инструментов.

Вставьте поддерживаемую ссылку, выберите формат и скачайте файл. Доступные форматы зависят от источника.

[Zenith Type](https://zenithw.space/typing) предлагает тренировку печати на турецком/английском, профили, проверенные рейтинги, рейтинговые дуэли и приватные комнаты. Для онлайн-функций нужна учётная запись; для локальной тренировки — нет. Рейтинги WPM и Elo рейтинговых дуэлей сбрасываются каждые 30 дней. Приватный Elo хранится отдельно и не сбрасывается. Правила, настройки комнат и статус развёртывания описаны в [документации Type](docs/TYPING.md).

## Что нового в веб-версии 17.0

- Более отзывчивое [разделение аудио](https://zenithw.space/ru/audio-separator): обработка волновых форм небольшими порциями, память воспроизведения по необходимости и отменяемый экспорт WAV/ZIP. MP3 и FLAC остаются доступны.
- [Remux](https://zenithw.space/ru/remux) позволяет выбрать выходной контейнер до запуска, включая MKV ↔ MP4 при совместимых дорожках. Несовместимые кодеки требуют конвертации.
- Более понятные инструкции и поисковые метаданные на восьми языках сайта; исправленные навигационные ссылки.
- Обновления безопасности зависимостей, общий предел ожидания обложек и защита от одновременных изменений аватара Type. Изменения сервера и установленных приложений требуют отдельных развёртываний.

Аудио разделяется на вашем устройстве: файл до 96 MiB, обрабатываемый фрагмент до четырёх минут. При первом запуске загружаются модель и среда обработки. Скорость зависит от устройства. Номера версий Windows и Android независимы от Web 17.0.

[Заметки о выпуске](https://zenithw.space/ru/updates) · [Отчёт о безопасности и проверках — английский](docs/full-code-audit-2026-11-02.md)

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
