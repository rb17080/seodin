// SEOdin service worker (MV3).
// Single job: make clicking the toolbar icon open the side panel.

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error("SEOdin: setPanelBehavior failed", err));
});

// Defensive: also set behavior on startup in case the install event was missed.
chrome.runtime.onStartup?.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});
});
