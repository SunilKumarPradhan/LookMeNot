(function () {
  if (window.__LOOKMENOT_PAGE_BRIDGE__) return;
  Object.defineProperty(window, "__LOOKMENOT_PAGE_BRIDGE__", { value: true });

  var MAX_JSON_CHARS = 6000000;

  function looksUsefulUrl(url) {
    return /langfuse|trace|traces|observation|observations|generation|sessions|api/i.test(String(url || ""));
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
        "*"
      );
    } catch {
      // Some payloads may not be structured-cloneable; skip them quietly.
    }
  }

  function parseMaybeJson(text) {
    if (!text || text.length > MAX_JSON_CHARS) return null;
    var trimmed = text.trim();
    if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  function inspectResponse(url, contentType, textPromise, kind) {
    if (!looksUsefulUrl(url) && !/json/i.test(String(contentType || ""))) return;
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
          var contentType = response.headers && response.headers.get ? response.headers.get("content-type") : "";
          inspectResponse(url, contentType, response.clone().text(), "fetch-json");
        } catch {}
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
            var contentType = this.getResponseHeader ? this.getResponseHeader("content-type") : "";
            if (this.responseType === "json" && this.response) {
              if (looksUsefulUrl(url) || /json/i.test(String(contentType || ""))) postJson("xhr-json", url, this.response);
              return;
            }
            inspectResponse(url, contentType, Promise.resolve(String(this.responseText || "")), "xhr-json");
          } catch {}
        });
      } catch {}
      return originalSend.apply(this, arguments);
    };
  }
})();
