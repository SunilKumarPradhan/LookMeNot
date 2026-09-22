# Publishing LookMeNot on addons.mozilla.org (AMO)

Policies: https://extensionworkshop.com/documentation/publish/add-on-policies/
Publisher resources: https://extensionworkshop.com/documentation/manage/resources-for-publishers/

## 0. If a submission gets rejected

The public page `addons.mozilla.org/firefox/addon/<slug>/` returns "Oops! We can't find that page" for any add-on that is not public (rejected, disabled, unlisted or still in review), so it does not tell you the reason.

1. Open https://addons.mozilla.org/developers/addons and sign in.
2. Open the add-on -> Manage Status & Versions -> the rejected version. Read the reviewer comment there. The same text is emailed to the account address.
3. Fix exactly what it says, in addition to the checklist below.

(v0.1.0 of this add-on went through this loop once and was later approved.)

## 1. Pre-flight checklist

- [ ] `package.json` version is higher than any version ever uploaded (AMO never accepts the same version twice, even when rejected). Currently 0.2.0.
- [ ] `npm ci && npm run package:firefox` finishes with 0 lint errors (2 known react-dom warnings, see README).
- [ ] `npm run package:source` created the source zip.
- [ ] Manual test in Firefox: `npx web-ext run --source-dir dist/firefox`, open `https://cloud.langfuse.com`, click Upload JSON, choose `test-data/sample-trace.json`. On a non-Langfuse page, click the toolbar button and confirm the pane opens.
- [ ] Take a real screenshot of that result (not a mock-up) and save it outside the repo or as `store/screenshot-*.png`.
- [ ] Privacy policy text (`store/privacy-policy.md`) matches behaviour (no storage, no network).
- [ ] Listing text (`store/amo-listing.md`) says "unofficial / not affiliated with Langfuse".

## 2. Build the two files

```bash
cd extension
npm ci
npm run package:firefox     # artifacts/lookmenot-0.2.0-firefox.zip   -> the add-on
npm run package:source      # artifacts/lookmenot-0.2.0-source.zip    -> the source code
```

Only upload the add-on zip in the add-on upload field. The source zip goes in the separate source-code field.

## 3. Submit

Case A - the listing still exists in your Developer Hub (most likely):

1. Developer Hub -> the add-on -> Manage Status & Versions -> Upload New Version.
2. Distribution: On this site (listed).
3. Upload `lookmenot-<version>-firefox.zip`. Wait for validation: expect 0 errors and the 2 react-dom `UNSAFE_VAR_ASSIGNMENT` warnings.
4. "Do you need to submit source code?" -> Yes -> upload `lookmenot-<version>-source.zip`.
5. Release notes: paste "Version Notes" from `store/amo-listing.md`.
6. Notes to Reviewer: paste "Notes To Reviewer" from `store/amo-listing.md`.
7. Submit Version.

Case B - the add-on was deleted, or you want a fresh listing:

1. https://addons.mozilla.org/developers/addon/submit/distribution -> On this site -> upload the add-on zip and the source zip as above.
2. If AMO reports "Duplicate add-on ID found", change `browser_specific_settings.gecko.id` in `manifests/firefox.json` (for example `lookmenot@sunilkumarpradhan.github.io`), rebuild, upload again. IDs of deleted add-ons cannot be reused.
3. Fill in the listing from `store/amo-listing.md`: name, summary, description, category (Developer Tools), MIT license, support URL, privacy policy, real screenshot.

## 4. After submitting

- Reviews are queued; typical wait is days. Status appears under Manage Status & Versions.
- If a reviewer asks something, answer in the Developer Hub thread (or the email reply). Do not upload a new version just to answer a question.
- If rejected again, read the comment, fix it, bump the version, repeat section 2 and 3.

## 5. Later updates

1. Change code.
2. Bump `version` in `package.json` (manifest version is injected from it).
3. `npm run package:firefox && npm run package:source`.
4. Manage Status & Versions -> Upload New Version, attach both zips.

## 6. Policy map: what this codebase does

| Policy | How LookMeNot complies |
| --- | --- |
| No remote code | Everything ships in the package; no `fetch`, no external scripts. |
| No obfuscation; minified code needs source | `assets/content.js` is a plain Vite minified bundle. Source zip rebuilds it byte for byte with `npm ci && npm run build:firefox`. No post-build patching, including of the two `UNSAFE_VAR_ASSIGNMENT` lint warnings (react-dom's own `dangerouslySetInnerHTML` internals, unreachable from this extension's code, see extension/README.md) — patching those to silence the linter would itself be exactly this kind of obfuscation, so this build doesn't do it. |
| Only release versions of libraries | React 18.3, react-dom, lucide-react, @tanstack/react-virtual from npm, pinned by lock file, unmodified. |
| Minimal permissions | `activeTab`, `scripting`, and `https://*.cloud.langfuse.com/*`. No `<all_urls>`, no `web_accessible_resources`. |
| Data collection disclosure | `data_collection_permissions.required = ["none"]`; nothing leaves the tab; privacy policy matches. |
| Function only as described | Listing text, screenshot and notes describe exactly what the pane does. |
| No misleading branding | Name uses "Trace Reader for Langfuse" plus an "unofficial" disclaimer. |
| Performance | No polling; page scans run once, then only on DOM changes and never while the tab is hidden. |
