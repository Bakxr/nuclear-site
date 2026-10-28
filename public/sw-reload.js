// Imported by the generated service worker (vite.config.js, workbox
// importScripts). When a new build's worker replaces an old one, reload the
// open tabs once so readers get the new site now rather than on their next
// visit. This runs in the new worker, so it works even for tabs still running
// an old build's page code.
//
// The tabs to reload are the ones already controlled by this registration
// when the new worker activates, i.e. by the old worker. On a first install
// no tab is controlled yet, so nothing reloads. (Workers can be stopped
// between install and activate, so no state is kept in between.)
//
// The reloads are started, not awaited: the browser holds a reload's request
// until activation ends, so awaiting it inside waitUntil hangs the tab.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((tabs) => {
      if (!tabs.length) return null;
      return self.clients.claim().then(() => {
        tabs.forEach((tab) => { tab.navigate(tab.url).catch(() => null); });
      });
    }),
  );
});
