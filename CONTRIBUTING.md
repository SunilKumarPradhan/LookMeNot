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
cd extension-web
npm install
npm run get-package
```

If `make` is not available on Windows, use the manual commands in the README.

## Tests And Checks

Run backend parser tests:

```powershell
cd backend
python -m pytest
```

Run the extension build:

```powershell
cd extension-web
npm run build
```

Before opening a pull request, run the smallest check that covers your change. If you change extension packaging, also test `npm run get-package` for the affected browser.

## Pull Requests

- Keep changes focused and explain the user-visible behavior.
- Include tests or sample data when changing parser behavior.
- Update docs when install, packaging, permissions, or privacy behavior changes.
- Do not commit generated dependency folders such as `node_modules/`.

## Support

Use GitHub Issues for bugs, feature requests, and setup questions:

https://github.com/SunilKumarPradhan/LookMeNot/issues