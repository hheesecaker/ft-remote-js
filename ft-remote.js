(function () {
  var version = "1.1.4";
  var source = "https://raw.githubusercontent.com/hheesecaker/ft-remote-js/main/ft-remote.js";
  var mockUser = {
    level: "subscribed",
    subscriptionLevel: "subscribed",
    loggedIn: true,
    loggedInStatus: true,
    isRegistered: true,
    isSubscribed: true,
    isTrialist: false,
    uuid: "ft-remote-subscribed-test-user",
    id: "ft-remote-subscribed-test-user",
    firstName: "Subscribed",
    lastName: "Tester",
    displayName: "Subscribed Tester",
    email: "subscribed-tester@example.invalid",
    demographics: {
      industry: null,
      position: null,
      responsibility: null
    },
    consent: {
      enhancement: false,
      marketing: false
    }
  };
  var mock = {
    enabled: true,
    version: version,
    mode: "subscribed",
    user: mockUser,
    bridgeHooked: false,
    bridgeListeners: {},
    emissions: 0,
    nativeStateRewrites: 0,
    webStateApplied: false,
    webUserLevel: null,
    bodyStateApplied: false,
    installedAt: new Date().toISOString(),
    lastEmittedAt: null,
    lastNativeStateAt: null,
    lastVerifiedAt: null
  };
  var pendingEmitTimer = null;
  var stateSummary = {
    webStateApplied: false,
    webUserLevel: null,
    bodyStateApplied: false,
    emissions: 0,
    nativeStateRewrites: 0,
    verifiedAt: null
  };
  var loadStatus = {
    loaded: true,
    version: version,
    source: source,
    loadedAt: new Date().toISOString(),
    bannerShown: false,
    bannerShownAt: null,
    state: stateSummary,
    subscriptionMock: mock
  };

  function copyMockUser() {
    return JSON.parse(JSON.stringify(mockUser));
  }

  function copyRegisteredUser() {
    var user = copyMockUser();
    user.level = "registered";
    return user;
  }

  function copyNativeUser() {
    return {
      level: mockUser.level,
      uuid: mockUser.uuid
    };
  }

  function applySubscribedBodyState() {
    if (!document.body) {
      return;
    }

    document.body.classList.remove(
      "user-registered",
      "user-premium",
      "user-ft-edit"
    );
    document.body.classList.add("user-signed-in", "user-subscribed");
  }

  function refreshMockDiagnostics() {
    var storedUser = null;

    try {
      storedUser = JSON.parse(window.localStorage.getItem("user") || "null");
    } catch (error) {
      mock.diagnosticError = String(error);
    }

    mock.webUserLevel = storedUser && storedUser.level || null;
    mock.webStateApplied = Boolean(
      storedUser &&
      storedUser.level === "subscribed" &&
      storedUser.uuid === mockUser.uuid
    );
    mock.bodyStateApplied = Boolean(
      document.body &&
      document.body.classList.contains("user-signed-in") &&
      document.body.classList.contains("user-subscribed")
    );
    mock.lastVerifiedAt = new Date().toISOString();
    stateSummary.webStateApplied = mock.webStateApplied;
    stateSummary.webUserLevel = mock.webUserLevel;
    stateSummary.bodyStateApplied = mock.bodyStateApplied;
    stateSummary.emissions = mock.emissions;
    stateSummary.nativeStateRewrites = mock.nativeStateRewrites;
    stateSummary.verifiedAt = mock.lastVerifiedAt;
  }

  function emitSubscribedState() {
    var bridge = window.ftAppWrapperBridge;
    if (!bridge || typeof bridge.receiveBridgeMessage !== "function") {
      return false;
    }

    // The app's public bridge first seeds the web user, then promotes its
    // level. The promotion runs the app's own userPermissionsChanged flow,
    // which updates its store, body classes, navigation, and native shell.
    bridge.receiveBridgeMessage({
      type: "inAppBillingSubscriptionSuccess",
      data: copyRegisteredUser(),
      key: -1
    });
    bridge.receiveBridgeMessage({
      type: "updateSubscription",
      data: { newLevel: "subscribed" },
      key: -1
    });
    applySubscribedBodyState();
    mock.emissions += 1;
    mock.lastEmittedAt = new Date().toISOString();
    setTimeout(refreshMockDiagnostics, 0);

    try {
      window.dispatchEvent(new CustomEvent("ft-remote-subscription-mock", {
        detail: copyMockUser()
      }));
    } catch (error) {
      // The bridge event above is the authoritative test signal.
    }
    return true;
  }

  function scheduleSubscribedState(delay) {
    if (pendingEmitTimer !== null) {
      clearTimeout(pendingEmitTimer);
    }
    pendingEmitTimer = setTimeout(function () {
      pendingEmitTimer = null;
      emitSubscribedState();
    }, delay);
  }

  function showLoadBanner() {
    var banner;

    if (loadStatus.bannerShown) {
      return;
    }
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", showLoadBanner, {
        once: true
      });
      return;
    }

    banner = document.createElement("div");
    banner.id = "ft-remote-load-status";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.textContent = "FT remote script v" + version + " loaded successfully";
    banner.style.cssText = [
      "position:fixed",
      "z-index:2147483647",
      "top:calc(env(safe-area-inset-top, 0px) + 12px)",
      "left:16px",
      "right:16px",
      "max-width:420px",
      "margin:0 auto",
      "box-sizing:border-box",
      "padding:10px 14px",
      "border-radius:4px",
      "background:#0f0f0f",
      "color:#ffffff",
      "box-shadow:0 3px 12px rgba(0, 0, 0, 0.28)",
      "font:600 14px/20px -apple-system, BlinkMacSystemFont, sans-serif",
      "letter-spacing:0",
      "text-align:center",
      "pointer-events:none"
    ].join(";");
    document.body.appendChild(banner);
    loadStatus.bannerShown = true;
    loadStatus.bannerShownAt = new Date().toISOString();

    setTimeout(function () {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 30000);
  }

  function installBridgeMock() {
    var bridge = window.ftAppWrapperBridge;
    if (!bridge) {
      setTimeout(installBridgeMock, 50);
      return;
    }
    if (bridge.__ftSubscribedTestMockVersion === version) {
      mock.bridgeHooked = true;
      scheduleSubscribedState(0);
      return;
    }

    var originalFire = bridge.fire;
    bridge.fire = function (message) {
      var nextMessage = message;
      if (
        message &&
        message.name === "userstate"
      ) {
        var originalUser = message.args && message.args[0];
        nextMessage = {
          name: message.name,
          args: [copyNativeUser()]
        };
        mock.nativeStateRewrites += 1;
        mock.lastNativeStateAt = new Date().toISOString();
        stateSummary.nativeStateRewrites = mock.nativeStateRewrites;

        if (
          !originalUser ||
          originalUser.level !== "subscribed" ||
          !originalUser.uuid
        ) {
          scheduleSubscribedState(0);
        }
      }
      return originalFire.call(bridge, nextMessage);
    };

    var originalOn = bridge.on;
    bridge.on = function (type, callback) {
      var listenersWereReady = Boolean(
        mock.bridgeListeners.inAppBillingSubscriptionSuccess &&
        mock.bridgeListeners.updateSubscription
      );
      var result = originalOn.call(bridge, type, callback);
      if (
        type === "inAppBillingSubscriptionSuccess" ||
        type === "updateSubscription"
      ) {
        mock.bridgeListeners[type] = true;
      }
      if (
        !listenersWereReady &&
        mock.bridgeListeners.inAppBillingSubscriptionSuccess &&
        mock.bridgeListeners.updateSubscription
      ) {
        scheduleSubscribedState(0);
      }
      return result;
    };

    bridge.__ftSubscribedTestMockInstalled = true;
    bridge.__ftSubscribedTestMockVersion = version;
    mock.bridgeHooked = true;
    setTimeout(emitSubscribedState, 0);
    setTimeout(emitSubscribedState, 500);
    setTimeout(emitSubscribedState, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySubscribedBodyState, {
      once: true
    });
  } else {
    applySubscribedBodyState();
  }

  window.__ftRemoteSubscriptionMock = mock;
  window.__ftRemoteGitHubScript = loadStatus;

  try {
    window.dispatchEvent(new CustomEvent("ft-remote-script-loaded", {
      detail: loadStatus
    }));
  } catch (error) {
    // The global status remains available in older web views.
  }

  try {
    window.postMessage({
      type: "ft-remote-script-loaded",
      loaded: true,
      version: version,
      source: source,
      loadedAt: loadStatus.loadedAt
    }, "*");
  } catch (error) {
    // The custom event and global status are the primary test signals.
  }

  installBridgeMock();
  showLoadBanner();

  if (window.console && window.console.info) {
    window.console.info(
      "[ft-remote-js] loaded v" + version + "; subscribed test state active",
      loadStatus
    );
  }
})();
