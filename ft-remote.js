(function () {
  var version = "1.1.6";
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
  var mockingbird = {
    appStarted: false,
    runtimeCaptured: false,
    moduleFound: false,
    moduleId: null,
    synchronized: false,
    attempts: 0,
    countReset: false,
    normalDecision: null,
    normalPolicy: null,
    premiumDecision: null,
    premiumPolicy: null,
    storagePresent: false,
    storedCount: 0,
    storedArticleCount: 0,
    correct: false,
    lastSynchronizedAt: null,
    lastVerifiedAt: null,
    error: null
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
    mockingbird: mockingbird,
    installedAt: new Date().toISOString(),
    lastEmittedAt: null,
    lastNativeStateAt: null,
    lastVerifiedAt: null
  };
  var pendingEmitTimer = null;
  var pendingMockingbirdTimer = null;
  var webpackRequire = null;
  var mockingbirdChunkRequested = false;
  var mockingbirdAppStarted = false;
  var stateSummary = {
    webStateApplied: false,
    webUserLevel: null,
    bodyStateApplied: false,
    emissions: 0,
    nativeStateRewrites: 0,
    mockingbird: mockingbird,
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
    var storedMeter = null;
    var userMeter = null;

    try {
      storedUser = JSON.parse(window.localStorage.getItem("user") || "null");
    } catch (error) {
      mock.diagnosticError = String(error);
    }

    try {
      storedMeter = JSON.parse(
        window.localStorage.getItem("mockingbird") || "null"
      );
    } catch (error) {
      mockingbird.error = String(error);
    }

    if (
      storedMeter &&
      storedMeter.tracking &&
      storedMeter.tracking[mockUser.uuid]
    ) {
      userMeter = storedMeter.tracking[mockUser.uuid];
    }

    mockingbird.storagePresent = Boolean(storedMeter);
    mockingbird.storedCount = Number(userMeter && userMeter.count) || 0;
    mockingbird.storedArticleCount = Object.keys(
      userMeter && userMeter.l || {}
    ).length;
    mockingbird.correct = Boolean(
      mockingbird.synchronized &&
      mockingbird.normalDecision === true &&
      mockingbird.normalPolicy === "SUBSCRIPTION_POLICY" &&
      mockingbird.premiumDecision === false &&
      mockingbird.premiumPolicy === "DENY_POLICY" &&
      mockingbird.storedCount === 0 &&
      mockingbird.storedArticleCount === 0
    );
    mockingbird.lastVerifiedAt = new Date().toISOString();

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
    if (
      !mockingbirdAppStarted &&
      mock.webStateApplied &&
      document.body &&
      !document.body.classList.contains("loading") &&
      !document.body.classList.contains("loaderror") &&
      !document.body.classList.contains("bootstraploading") &&
      !document.body.classList.contains("structureloading")
    ) {
      markMockingbirdAppStarted();
    }
    mock.lastVerifiedAt = new Date().toISOString();
    stateSummary.webStateApplied = mock.webStateApplied;
    stateSummary.webUserLevel = mock.webUserLevel;
    stateSummary.bodyStateApplied = mock.bodyStateApplied;
    stateSummary.emissions = mock.emissions;
    stateSummary.nativeStateRewrites = mock.nativeStateRewrites;
    stateSummary.verifiedAt = mock.lastVerifiedAt;
  }

  function isMockingbirdModule(candidate) {
    return Boolean(
      candidate &&
      typeof candidate.init === "function" &&
      typeof candidate.shouldShow === "function" &&
      typeof candidate.setOverrideLevel === "function" &&
      typeof candidate.resetCount === "function"
    );
  }

  function findMockingbirdModule(requireModule) {
    var candidate;
    var factorySource;
    var moduleIds;
    var moduleId;
    var index;

    if (!requireModule || !requireModule.m) {
      return null;
    }

    if (Object.prototype.hasOwnProperty.call(requireModule.m, "34014")) {
      try {
        candidate = requireModule(34014);
        if (isMockingbirdModule(candidate)) {
          return { id: "34014", value: candidate };
        }
      } catch (error) {
        mockingbird.error = String(error);
        return null;
      }
    }

    moduleIds = Object.keys(requireModule.m);
    for (index = 0; index < moduleIds.length; index += 1) {
      moduleId = moduleIds[index];
      try {
        factorySource = String(requireModule.m[moduleId]);
      } catch (error) {
        continue;
      }
      if (
        factorySource.indexOf("mockingbirdOverrideLevelChanged") === -1 ||
        factorySource.indexOf("PAYWALL_DISABLED") === -1
      ) {
        continue;
      }
      try {
        candidate = requireModule(moduleId);
        if (isMockingbirdModule(candidate)) {
          return { id: String(moduleId), value: candidate };
        }
      } catch (error) {
        mockingbird.error = String(error);
      }
    }

    return null;
  }

  function synchronizeMockingbird(requireModule) {
    var found = findMockingbirdModule(requireModule);
    var meter;
    var normalResult;
    var premiumResult;

    if (!found) {
      return false;
    }

    meter = found.value;
    try {
      meter.init();
      // Mockingbird has a separate in-memory override. Clear it so access is
      // driven by the real subscribed user store, then clear only this test
      // user's counted reads. Do not change limits or elevate to Premium.
      meter.setOverrideLevel(false);
      meter.resetCount(mockUser.uuid);
      normalResult = meter.shouldShow({
        id: "ft-remote-mockingbird-normal-probe",
        protectionlevel: "normal"
      });
      premiumResult = meter.shouldShow({
        id: "ft-remote-mockingbird-premium-probe",
        protectionlevel: "premium"
      });

      mockingbird.moduleFound = true;
      mockingbird.moduleId = found.id;
      mockingbird.synchronized = true;
      mockingbird.countReset = true;
      mockingbird.normalDecision = Boolean(
        normalResult && normalResult.decision
      );
      mockingbird.normalPolicy = normalResult && normalResult.policy || null;
      mockingbird.premiumDecision = Boolean(
        premiumResult && premiumResult.decision
      );
      mockingbird.premiumPolicy = premiumResult && premiumResult.policy || null;
      mockingbird.lastSynchronizedAt = new Date().toISOString();
      mockingbird.error = null;
      setTimeout(refreshMockDiagnostics, 0);
      return true;
    } catch (error) {
      mockingbird.error = String(error);
      return false;
    }
  }

  function captureMockingbirdRuntime() {
    var chunks = window.webpackChunkft_app;
    var chunkId;

    if (mockingbird.attempts >= 40) {
      mockingbird.error = "Mockingbird module was not ready after 40 attempts";
      return;
    }
    mockingbird.attempts += 1;
    if (!chunks || typeof chunks.push !== "function") {
      scheduleMockingbirdSync(100);
      return;
    }

    chunkId = "ft-remote-mockingbird-" + version + "-" + mockingbird.attempts;
    try {
      chunks.push([[chunkId], {}, function (requireModule) {
        webpackRequire = requireModule;
        mockingbird.runtimeCaptured = true;

        if (synchronizeMockingbird(requireModule)) {
          return;
        }
        if (
          !mockingbirdChunkRequested &&
          typeof requireModule.e === "function"
        ) {
          mockingbirdChunkRequested = true;
          Promise.resolve(requireModule.e(875)).then(function () {
            if (!synchronizeMockingbird(requireModule)) {
              scheduleMockingbirdSync(100);
            }
          }).catch(function (error) {
            mockingbird.error = String(error);
            scheduleMockingbirdSync(250);
          });
          return;
        }
        scheduleMockingbirdSync(100);
      }]);
    } catch (error) {
      mockingbird.error = String(error);
      scheduleMockingbirdSync(250);
    }
  }

  function scheduleMockingbirdSync(delay) {
    if (!mockingbirdAppStarted) {
      return;
    }
    if (pendingMockingbirdTimer !== null) {
      clearTimeout(pendingMockingbirdTimer);
    }
    pendingMockingbirdTimer = setTimeout(function () {
      pendingMockingbirdTimer = null;
      if (webpackRequire && synchronizeMockingbird(webpackRequire)) {
        return;
      }
      captureMockingbirdRuntime();
    }, delay);
  }

  function markMockingbirdAppStarted() {
    if (mockingbirdAppStarted) {
      return;
    }
    mockingbirdAppStarted = true;
    mockingbird.appStarted = true;
    scheduleMockingbirdSync(0);
  }

  function armMockingbirdSynchronization() {
    if (
      Number(window.debugStartupStage) >= 400 ||
      (
        window.webpackChunkft_app &&
        document.body &&
        !document.body.classList.contains("loading") &&
        !document.body.classList.contains("loaderror") &&
        !document.body.classList.contains("bootstraploading") &&
        !document.body.classList.contains("structureloading")
      )
    ) {
      markMockingbirdAppStarted();
      return;
    }
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", armMockingbirdSynchronization, {
        once: true
      });
      return;
    }
    document.body.addEventListener("AppStarted", markMockingbirdAppStarted, {
      once: true
    });
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
    scheduleMockingbirdSync(0);
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
  armMockingbirdSynchronization();
  showLoadBanner();

  if (window.console && window.console.info) {
    window.console.info(
      "[ft-remote-js] loaded v" + version + "; subscribed test state active",
      loadStatus
    );
  }
})();
