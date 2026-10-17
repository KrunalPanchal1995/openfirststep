// openfirststep client beacon. Sends ONE request per page view containing only:
//   p   - the page path (no query string, no hash)
//   r   - the referring site's hostname (no path, no query)
//   via - an optional tag you put in the link you share, e.g. ?via=mom
// No cookies, no storage of identifiers, no fingerprinting.
(function () {
  var script = document.currentScript;
  var endpoint = script && script.getAttribute("data-endpoint");
  if (!endpoint) return;

  try {
    if (localStorage.getItem("ofsIgnore")) return; // owner opt-out
  } catch (e) {}

  var url = new URL(location.href);
  var via = url.searchParams.get("via");
  if (via) {
    // Remove the tag from the address bar so it isn't re-shared onward.
    url.searchParams.delete("via");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  var ref = "";
  try {
    if (document.referrer) {
      var r = new URL(document.referrer);
      if (r.hostname !== location.hostname) ref = r.hostname;
    }
  } catch (e) {}

  var body = JSON.stringify({ p: location.pathname, r: ref, via: via || "" });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint.replace(/\/$/, "") + "/hit", body);
  } else {
    fetch(endpoint.replace(/\/$/, "") + "/hit", { method: "POST", body: body, keepalive: true });
  }
})();
