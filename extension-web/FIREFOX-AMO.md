# Firefox / Mozilla Add-ons Publishing

This folder can build a Firefox-specific package for Mozilla Add-ons (AMO).

## Build

```powershell
cd extension-web
npm install
npm run package:firefox
```

Outputs:

```text
extension-web/dist-packages/firefox/LOOKMENOT-FIREFOX-ADDON-NO-WARNINGS-UPLOAD-THIS.zip
extension-web/dist-packages/firefox/LOOKMENOT-SOURCE-CODE-NO-WARNINGS-DO-NOT-UPLOAD-AS-ADDON.zip
```

Upload `LOOKMENOT-FIREFOX-ADDON-NO-WARNINGS-UPLOAD-THIS.zip` as the add-on package. This ZIP has `manifest.json` at the root, which is required by AMO's first validation step.

Do not upload `LOOKMENOT-SOURCE-CODE-NO-WARNINGS-DO-NOT-UPLOAD-AS-ADDON.zip` in the first add-on upload field. Use it only later if AMO asks for source code for the generated Vite bundle.

## Version Notes

Initial Firefox release of LookMeNot. This release adds a local Langfuse trace reader panel, automatic detection on Langfuse Cloud pages, toolbar activation for self-hosted Langfuse instances, manual JSON upload/paste fallback, search, filters, and expandable tool call/result cards.

## Notes To Reviewer

- The add-on does not require a test account. If automatic trace detection is not available on the page under review, use the manual Upload JSON or Paste JSON action with any Langfuse trace export containing `input` and optional `output` payloads.
- The package is open source under the MIT License at `https://github.com/SunilKumarPradhan/LookMeNot`.
- The Firefox package is built with `npm run package:firefox` and has been checked with Mozilla's add-on linter with 0 errors, 0 warnings, and 0 notices.

## Local Test In Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click Load Temporary Add-on.
3. Select `extension-web/dist-firefox/manifest.json`.
4. Open a Langfuse page, or click the toolbar icon on a self-hosted Langfuse page.

## AMO Listing Draft

Use `store-assets/amo-listing.md` for the listing copy.

## Privacy

Use `store-assets/privacy-policy.md` as the privacy policy content. Host it at a public HTTPS URL before submitting the final listed add-on.

## License And Support

- License: MIT License
- Support website: `https://github.com/SunilKumarPradhan/LookMeNot/issues`
