/* Asagiri lorebook, offline (his pick 2026-10-28, research/lorebook-improvements-2026-10-28.md): a service worker scoped to the
   site's folder. The build writes its version and the files every page needs into the line below
   (asagiri_lore_site.service_worker), so each build installs a new worker that stores that build's files whole before it takes
   over: a page never mixes two builds' scripts and data. Pages come from the network first; offline, the site's home page
   stands in for any page and the app draws the asked one from the stored data. Pictures are kept as they are seen (the newest
   MAX_IMAGES), per build. */
var LOREBOOK = {"version": "d7cec2127930aa32", "shell": ["./", "app.js", "pages.js", "bench.js", "depth.js", "play.js", "reader.js", "style.css", "data.json", "manifest.webmanifest", "favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png"]};
var STATIC = "lore-static-" + LOREBOOK.version, IMAGES = "lore-images-" + LOREBOOK.version, MAX_IMAGES = 400;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(STATIC).then(function (c) { return c.addAll(LOREBOOK.shell); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {   // an older build's stores go
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return /^lore-/.test(k) && k !== STATIC && k !== IMAGES; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function trim(cache) {
  return cache.keys().then(function (keys) {
    return Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_IMAGES)).map(function (k) { return cache.delete(k); }));
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(function () {
      return caches.open(STATIC).then(function (c) { return c.match("./"); });
    }));
    return;
  }
  if (/\.(webp|png|jpe?g)$/i.test(url.pathname) && !LOREBOOK.shell.some(function (f) { return url.pathname.slice(-f.length - 1) === "/" + f; })) {
    e.respondWith(caches.open(IMAGES).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) {
          if (res.ok) c.put(req, res.clone()).then(function () { return trim(c); });
          return res;
        });
      });
    }));
    return;
  }
  if (req.url.indexOf(self.registration.scope) === 0) {   // this build's own files, else the network
    e.respondWith(caches.open(STATIC).then(function (c) {
      return c.match(req, {ignoreSearch: true}).then(function (hit) { return hit || fetch(req); });
    }));
  }
});
