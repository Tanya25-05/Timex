// background.js
let activeTabId = null;
let startTime = null;
let isTracking = false;
let currentTabTimer = 0;
let timerInterval;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleTracking") {
    isTracking = request.isTracking;
    if (isTracking) {
      startTime = Date.now();
      currentTabTimer = 0;
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          activeTabId = tabs[0].id;
          startTimer();
        }
      });
    } else {
      if (activeTabId) {
        updateTimeForPreviousTab();
      }
      activeTabId = null;
      startTime = null;
      clearInterval(timerInterval);
    }
    sendResponse({ status: "success" });
  } else if (request.action === "getTrackingStatus") {
    sendResponse({
      isTracking: isTracking,
      currentTime: currentTabTimer,
    });
  } else if (request.action === "getCurrentTime") {
    sendResponse({
      currentTime: currentTabTimer,
    });
  }
  return true;
});

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (isTracking && startTime) {
      currentTabTimer = Date.now() - startTime;
    }
  }, 10); // Update every 10ms for smooth millisecond display
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (isTracking) {
    handleTabChange(activeInfo.tabId);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (isTracking && tabId === activeTabId && changeInfo.status === "complete") {
    handleTabChange(tabId);
  }
});

function handleTabChange(tabId) {
  if (activeTabId) {
    updateTimeForPreviousTab();
  }

  activeTabId = tabId;
  startTime = Date.now();
  currentTabTimer = 0;
  startTimer();
}

function updateTimeForPreviousTab() {
  if (!startTime) return;

  const endTime = Date.now();
  const timeSpent = endTime - startTime;

  chrome.tabs.get(activeTabId, function (tab) {
    const url = new URL(tab.url).hostname;
    const today = new Date().toISOString().split("T")[0];

    chrome.storage.local.get([today], function (result) {
      let dailyData = result[today] || {};
      dailyData[url] = (dailyData[url] || 0) + timeSpent;

      let storageUpdate = {};
      storageUpdate[today] = dailyData;
      chrome.storage.local.set(storageUpdate);
    });
  });
}
