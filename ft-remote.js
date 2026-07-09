(function () {
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
    mode: "subscribed",
    user: mockUser,
    bridgeHooked: false,
    emissions: 0,
    installedAt: new Date().toISOString(),
    lastEmittedAt: null
  };
  var pendingEmitTimer = null;

  function copyMockUser() {
    return JSON.parse(JSON.stringify(mockUser));
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

  function emitSubscribedState() {
    var bridge = window.ftAppWrapperBridge;
    if (!bridge || typeof bridge.receiveBridgeMessage !== "function") {
      return false;
    }

    bridge.receiveBridgeMessage({
      type: "userPermissionsChanged",
      data: copyMockUser(),
      key: -1
    });
    applySubscribedBodyState();
    mock.emissions += 1;
    mock.lastEmittedAt = new Date().toISOString();

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

  function installBridgeMock() {
    var bridge = window.ftAppWrapperBridge;
    if (!bridge) {
      setTimeout(installBridgeMock, 50);
      return;
    }
    if (bridge.__ftSubscribedTestMockInstalled) {
      mock.bridgeHooked = true;
      scheduleSubscribedState(0);
      return;
    }

    var originalReceiveBridgeMessage = bridge.receiveBridgeMessage;
    bridge.receiveBridgeMessage = function (message) {
      var nextMessage = message;
      if (
        message &&
        message.type === "userPermissionsChanged" &&
        !(Number(message.key) >= 0)
      ) {
        nextMessage = {
          type: message.type,
          data: copyMockUser(),
          key: message.key
        };
      }
      return originalReceiveBridgeMessage.call(bridge, nextMessage);
    };

    var originalOn = bridge.on;
    bridge.on = function (type, callback) {
      var result = originalOn.call(bridge, type, callback);
      if (type === "userPermissionsChanged") {
        scheduleSubscribedState(0);
      }
      return result;
    };

    bridge.__ftSubscribedTestMockInstalled = true;
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
  window.__ftRemoteGitHubScript = {
    loaded: true,
    source: source,
    loadedAt: new Date().toISOString(),
    subscriptionMock: mock
  };

  installBridgeMock();

  if (window.console && window.console.info) {
    window.console.info("[ft-remote-js] subscribed test state active", mock);
  }
})();
