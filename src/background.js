// src/background.js
// let timer = 0;
// let isRunning = false;
let tab = null;

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      alert("Hello from my extension!");
    },
  });
});

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === 'startTimer') {
//     isRunning = true;
//     activeTabId = request.tabId;
//     startTimer();
//   } else if (request.action === 'stopTimer') {
//     isRunning = false;
//     timer = 0;
//     activeTabId = null;
//   } else if (request.action === 'getTime') {
//     sendResponse({ time: timer });
//   }
// });

// chrome.tabs.onActivated.addListener((activeInfo) => {
//   if (isRunning && activeTabId !== activeInfo.tabId) {
//     isRunning = false;
//   }
// });

// function startTimer() {
//   setInterval(() => {
//     if (isRunning) {
//       timer++;
//       chrome.runtime.sendMessage({ action: 'updateTime', time: timer });
//     }
//   }, 1000);
// }

// Tab Timer Extension - Background Script
class TabTimerBackground {
  constructor() {
    this.tabTimers = new Map();
    this.activeTabId = null;
    this.isRunning = false;
    this.timerInterval = null;

    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.loadSavedTimers();
    this.startTimerLoop();
  }

  setupEventListeners() {
    // Handle messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivation(activeInfo);
    });

    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete") {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // Handle tab removal
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoval(tabId);
    });

    // Handle extension installation/update
    chrome.runtime.onInstalled.addListener(() => {
      this.initializeStorage();
    });
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case "getTabs":
        this.getTabsData(sendResponse);
        break;
      case "startTabTimer":
        this.startTabTimer(request.tabId);
        sendResponse({ success: true });
        break;
      case "stopTabTimer":
        this.stopTabTimer(request.tabId);
        sendResponse({ success: true });
        break;
      case "resetTabTimer":
        this.resetTabTimer(request.tabId);
        sendResponse({ success: true });
        break;
      case "startAllTimers":
        this.startAllTimers();
        sendResponse({ success: true });
        break;
      case "stopAllTimers":
        this.stopAllTimers();
        sendResponse({ success: true });
        break;
      case "resetAllTimers":
        this.resetAllTimers();
        sendResponse({ success: true });
        break;
      default:
        sendResponse({ error: "Unknown action" });
    }
  }

  async getTabsData(sendResponse) {
    try {
      const tabs = await chrome.tabs.query({});
      const tabsData = tabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        active: tab.active,
        time: this.tabTimers.get(tab.id)?.time || 0,
        isRunning: this.tabTimers.get(tab.id)?.isRunning || false,
        lastActive: this.tabTimers.get(tab.id)?.lastActive || Date.now(),
      }));

      sendResponse({ tabs: tabsData });
    } catch (error) {
      console.error("Failed to get tabs data:", error);
      sendResponse({ error: "Failed to get tabs data" });
    }
  }

  startTabTimer(tabId) {
    // Pause all other timers first
    this.tabTimers.forEach((timer, id) => {
      if (id !== tabId) {
        timer.isRunning = false;
      }
    });

    // Start the specified tab timer
    if (!this.tabTimers.has(tabId)) {
      this.tabTimers.set(tabId, {
        time: 0,
        isRunning: true,
        lastActive: Date.now(),
      });
    } else {
      const timer = this.tabTimers.get(tabId);
      timer.isRunning = true;
      timer.lastActive = Date.now();
    }

    this.saveTimers();
    this.broadcastUpdate();
  }

  stopTabTimer(tabId) {
    if (this.tabTimers.has(tabId)) {
      const timer = this.tabTimers.get(tabId);
      timer.isRunning = false;
      this.saveTimers();
      this.broadcastUpdate();
    }
  }

  resetTabTimer(tabId) {
    if (this.tabTimers.has(tabId)) {
      this.tabTimers.set(tabId, {
        time: 0,
        isRunning: false,
        lastActive: Date.now(),
      });
      this.saveTimers();
      this.broadcastUpdate();
    }
  }

  async startAllTimers() {
    try {
      // Get the current active tab in the current window
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (activeTab) {
        await chrome.runtime.sendMessage({
          action: "startTabTimer",
          tabId: activeTab.id,
        });
      }
    } catch (error) {
      console.error("Failed to start active tab timer:", error);
    }
  }

  stopAllTimers() {
    this.tabTimers.forEach((timer) => {
      timer.isRunning = false;
    });
    this.saveTimers();
    this.broadcastUpdate();
  }

  resetAllTimers() {
    this.tabTimers.clear();
    this.saveTimers();
    this.broadcastUpdate();
  }

  handleTabActivation(activeInfo) {
    const previousActiveTabId = this.activeTabId;
    this.activeTabId = activeInfo.tabId;

    // Initialize timer for new active tab if it doesn't exist
    if (!this.tabTimers.has(activeInfo.tabId)) {
      this.tabTimers.set(activeInfo.tabId, {
        time: 0,
        isRunning: false,
        lastActive: Date.now(),
      });
    }

    // If there was a previously active tab with a running timer, pause it
    if (previousActiveTabId && this.tabTimers.has(previousActiveTabId)) {
      const previousTimer = this.tabTimers.get(previousActiveTabId);
      if (previousTimer.isRunning) {
        previousTimer.isRunning = false;
      }
    }

    this.saveTimers();
    this.broadcastUpdate();
  }

  handleTabUpdate(tabId, tab) {
    // Update tab info if timer exists
    if (this.tabTimers.has(tabId)) {
      const timer = this.tabTimers.get(tabId);
      timer.lastActive = Date.now();
      this.saveTimers();
    }
  }

  handleTabRemoval(tabId) {
    // Remove timer data for closed tab
    this.tabTimers.delete(tabId);

    // If the active tab was closed, clear active tab reference
    if (this.activeTabId === tabId) {
      this.activeTabId = null;
    }

    this.saveTimers();
    this.broadcastUpdate();
  }

  startTimerLoop() {
    this.timerInterval = setInterval(() => {
      this.updateTimers();
    }, 1000);
  }

  updateTimers() {
    const now = Date.now();
    let hasUpdates = false;

    this.tabTimers.forEach((timer, tabId) => {
      if (timer.isRunning) {
        const elapsed = Math.floor((now - timer.lastActive) / 1000);
        if (elapsed > 0) {
          timer.time += elapsed;
          timer.lastActive = now;
          hasUpdates = true;
        }
      }
    });

    if (hasUpdates) {
      this.saveTimers();
      this.broadcastUpdate();
    }
  }

  broadcastUpdate() {
    chrome.runtime
      .sendMessage({
        action: "timerUpdate",
        timers: Object.fromEntries(this.tabTimers),
      })
      .catch(() => {
        // Ignore errors when no popup is open
      });
  }

  async saveTimers() {
    try {
      const timersData = Object.fromEntries(this.tabTimers);
      await chrome.storage.local.set({ tabTimers: timersData });
    } catch (error) {
      console.error("Failed to save timers:", error);
    }
  }

  async loadSavedTimers() {
    try {
      const result = await chrome.storage.local.get(["tabTimers"]);
      const savedTimers = result.tabTimers || {};

      this.tabTimers = new Map(Object.entries(savedTimers));
    } catch (error) {
      console.error("Failed to load timers:", error);
      this.tabTimers = new Map();
    }
  }

  async initializeStorage() {
    try {
      await chrome.storage.local.set({ tabTimers: {} });
    } catch (error) {
      console.error("Failed to initialize storage:", error);
    }
  }

  cleanup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}

// Initialize the background script
const tabTimerBackground = new TabTimerBackground();

// Cleanup on extension unload
chrome.runtime.onSuspend.addListener(() => {
  tabTimerBackground.cleanup();
});
