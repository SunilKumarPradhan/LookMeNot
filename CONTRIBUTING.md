# Contributing To LookMeNot

Thanks for helping improve LookMeNot. The project is small on purpose: a parser, a web viewer, and a browser extension that makes Langfuse traces easier to read.

## Good First Contributions

- Improve trace parsing for real Langfuse edge cases.
- Add focused tests for parser behavior.
- Improve browser extension usability.
- Improve docs, install steps, screenshots, and troubleshooting.
- Report confusing traces with sanitized sample JSON.

## Local Setup

Backend and demo frontend:

```powershell
make install
make up
```

Browser extension:

```powershell
cd extension
npm ci
npm run build:firefox
```

If `make` is not available on Windows, use the manual commands in the README.

## Tests And Checks

Run backend parser tests:

```powershell
cd backend
python -m pytest
```

Type-check, build, and lint the extension:

```powershell
cd extension
npm run build:firefox
npm run lint:firefox
```

Before opening a pull request, run the smallest check that covers your change. If you change extension packaging, also run `npm run package:firefox` (and `npm run package:chrome`) and check the zip in `extension/artifacts/`.

## Pull Requests

- Keep changes focused and explain the user-visible behavior.
- Include tests or sample data when changing parser behavior.
- Update docs when install, packaging, permissions, or privacy behavior changes.
- Do not commit generated dependency folders such as `node_modules/`.

## Support

Use GitHub Issues for bugs, feature requests, and setup questions:

https://github.com/SunilKumarPradhan/LookMeNot/issues