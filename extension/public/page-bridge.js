// LookMeNot page bridge. Runs in the page's own JavaScript world (manifest `world: "MAIN"`).
//
// The Langfuse UI loads trace data through same-origin API calls. To read that data, this
// script wraps window.fetch and XMLHttpRequest and forwards a copy of matching JSON
// responses to the LookMeNot content script with window.postMessage. Nothing is sent
// anywhere else: the message stays inside this tab and is addressed to the page's own origin.
//
// Scope limits:
//   - only same-origin requests are inspected
//   - only Langfuse API / trace-like URLs are inspected
//   - only bodies that parse as JSON and are under MAX_JSON_CHARS are forwarded
(function () {
  "use strict";

  if (window.__LOOKMENOT_PAGE_BRIDGE__) return;
  Object.defineProperty(window, "__LOOKMENOT_PAGE_BRIDGE__", { value: true });

  var MAX_JSON_CHARS = 6000000;
  var API_PATH = /\/api\/(trpc|public)\//i;
  var TRACE_PATH = /trace|observation|generation|session/i;

  function isTraceRequest(url) {
    try {
      var parsed = new URL(String(url || ""), window.location.href);
      if (parsed.origin !== window.location.origin) return false;
      return API_PATH.test(parsed.pathname) || TRACE_PATH.test(parsed.pathname);
    } catch (error) {
      return false;
    }
  }

  function postJson(kind, url, data) {
    try {
      window.postMessage(
        {
          source: "lookmenot-page-bridge",
          kind: kind,
          url: String(url || ""),
          data: data,
          capturedAt: Date.now(),
        },
        window.location.origin
      );
    } catch (error) {
      // Payload not structured-cloneable; skip it.
    }
  }

  function parseMaybeJson(text) {
    if (!text || text.length > MAX_JSON_CHARS) return null;
    var trimmed = text.trim();
    if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      return null;
    }
  }

  // Callers check isTraceRequest(url) first so unrelated responses are never cloned or read.
  function inspectResponse(url, textPromise, kind) {
    textPromise
      .then(function (text) {
        var data = parseMaybeJson(text);
        if (data !== null) postJson(kind, url, data);
      })
      .catch(function () {});
  }

  var originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = function () {
      var args = arguments;
      return originalFetch.apply(this, args).then(function (response) {
        try {
          var request = args[0];
          var url = response.url || (request && request.url) || request || "";
          if (isTraceRequest(url)) inspectResponse(url, response.clone().text(), "fetch-json");
        } catch (error) {
          // Never let inspection break the page's own request.
        }
        return response;
      });
    };
  }

  var OriginalXHR = window.XMLHttpRequest;
  if (OriginalXHR && OriginalXHR.prototype) {
    var originalOpen = OriginalXHR.prototype.open;
    var originalSend = OriginalXHR.prototype.send;

    OriginalXHR.prototype.open = function (method, url) {
      this.__lookmenotUrl = url;
      return originalOpen.apply(this, arguments);
    };

    OriginalXHR.prototype.send = function () {
      try {
        this.addEventListener("load", function () {
          try {
            if (this.responseType && this.responseType !== "text" && this.responseType !== "json") return;
            var url = this.responseURL || this.__lookmenotUrl || "";
            if (!isTraceRequest(url)) return;
            if (this.responseType === "json") {
              if (this.response) postJson("xhr-json", url, this.response);
              return;
            }
            inspectResponse(url, Promise.resolve(String(this.responseText || "")), "xhr-json");
          } catch (error) {
            // Ignore inspection failures.
          }
        });
      } catch (error) {
        // Ignore listener failures.
      }
      return originalSend.apply(this, arguments);
    };
  }
})();
