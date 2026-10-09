# Contributing to ZenithW

Bug reports, translations, documentation improvements and focused pull requests are welcome.

## Report a problem

Open a [GitHub issue](https://github.com/boranseasonnew/zenithw/issues) with your app version, operating system, steps to reproduce, expected result and the relevant error. Remove cookies, tokens, private links and personal data from logs or screenshots.

## Make a change

Keep each pull request focused on one problem. Explain what changes for the user and how you checked it. Keep translated README content consistent across the existing languages. Do not commit credentials, browser sessions or generated release binaries.

See [self-hosting and development](docs/SELF_HOSTING.md) for web setup, [desktop instructions](desktop/README.md) for Windows, and the [Android repository](https://github.com/boranseasonnew/zenithw-android) for current mobile development.

Run checks relevant to the files you change:

- Web release descriptions and links: `npm run check:release-content` from the repository root.
- Local media processing: `npm run test:media` from the repository root.
- Web language behavior: `npm run test:about` and `npm run test:languages` from the repository root.
- Backend behavior: `python -m unittest discover -s tests -q` from `backend/`, using its development environment.
- Windows application: `npm test` from `desktop/`.

## Licenses

ZenithW is licensed under [AGPL-3.0-only](LICENSE). Preserve third-party license and attribution notices when changing or distributing dependencies.
