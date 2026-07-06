(function () {
  var state = {
    loaded: true,
    source: "https://raw.githubusercontent.com/hheesecaker/ft-remote-js/main/ft-remote.js",
    loadedAt: new Date().toISOString()
  };

  window.__ftRemoteGitHubScript = state;

  if (window.console && window.console.info) {
    window.console.info("[ft-remote-js] loaded", state);
  }
})();
