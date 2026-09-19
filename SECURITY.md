# Security Policy

LookMeNot is a local trace viewer. It should not send trace content to LookMeNot servers, analytics providers, advertising networks, or third parties.

## Reporting Security Issues

For public, non-sensitive security concerns, open an issue:

https://github.com/SunilKumarPradhan/LookMeNot/issues

If a report contains private trace data, credentials, tokens, or an exploitable vulnerability, do not paste those details into a public issue. Open a minimal public issue first and ask for a private contact path.

## Scope

Security-relevant areas include:

- Browser extension permissions and content script behavior.
- Trace JSON parsing and rendering.
- Local package generation scripts.
- Privacy regressions that transmit trace content outside the browser tab.

## Privacy Baseline

The extension processes trace content locally in the browser. It does not include analytics, telemetry, advertising, or a remote parser service.