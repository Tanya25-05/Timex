// Tab Timer Extension - Main Popup Script
class TabTimerApp {
  constructor() {
    this.tabs = [];
    this.currentTab = null;
    this.isRunning = false;
    this.timerInterval = null;

    this.initialize();
  }

  initialize() {
    document.addEventListener("DOMContentLoaded", () => {
      this.render();
      this.loadTabs();
      this.setupEventListeners();
      this.startTimerLoop();
    });
  }

  render() {
    const root = document.getElementById("root");
    if (!root) return;

    root.innerHTML = `
      <div class="tab-timer-app">
        <header class="app-header">
          <h1>Tab Timer</h1>
          <div class="header-controls">
            <button id="start-all-btn" class="btn btn-primary">Start Active</button>
            <button id="stop-all-btn" class="btn btn-secondary">Stop All</button>
            <button id="reset-all-btn" class="btn btn-warning">Reset All</button>
          </div>
        </header>

        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-label">Total Time</span>
            <span id="total-time" class="stat-value">00:00:00</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Running Timer</span>
            <span id="active-tabs" class="stat-value">None</span>
          </div>
        </div>

        <div class="tabs-container">
          <div class="tabs-header">
            <h3>Tab Timers</h3>
            <div class="tabs-controls">
              <input type="text" id="search-tabs" placeholder="Search tabs..." class="search-input">
              <select id="sort-tabs" class="sort-select">
                <option value="time">Sort by Time</option>
                <option value="name">Sort by Name</option>
                <option value="recent">Sort by Recent</option>
              </select>
            </div>
          </div>
          
          <div id="tabs-list" class="tabs-list">
            <!-- Tab items will be rendered here -->
          </div>
        </div>

        <div class="app-footer">
          <button id="export-data" class="btn btn-outline">Export Data</button>
          <button id="clear-data" class="btn btn-outline">Clear All Data</button>
          <a href="http://localhost:3000" target="_blank" class="btn btn-primary">Analyze Data</a>
        </div>
      </div>
    `;
  }

  async loadTabs() {
    try {
      // Get all tabs
      const tabs = await chrome.tabs.query({});
      this.tabs = tabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        time: 0,
        isActive: tab.active,
        isRunning: false,
        lastActive: Date.now(),
        favIconUrl: tab.favIconUrl,
      }));

      // Load saved timer data
      const result = await chrome.storage.local.get(["tabTimers"]);
      const savedTimers = result.tabTimers || {};

      this.tabs.forEach((tab) => {
        if (savedTimers[tab.id]) {
          tab.time = savedTimers[tab.id].time || 0;
          tab.isRunning = savedTimers[tab.id].isRunning || false;
        }
      });

      this.renderTabsList();
      this.updateStats();
    } catch (error) {
      console.error("Failed to load tabs:", error);
    }
  }

  renderTabsList() {
    const tabsList = document.getElementById("tabs-list");
    if (!tabsList) return;

    const searchTerm =
      document.getElementById("search-tabs")?.value.toLowerCase() || "";
    const sortBy = document.getElementById("sort-tabs")?.value || "time";

    let filteredTabs = this.tabs.filter(
      (tab) =>
        tab.title.toLowerCase().includes(searchTerm) ||
        tab.url.toLowerCase().includes(searchTerm)
    );

    // Sort tabs
    filteredTabs.sort((a, b) => {
      switch (sortBy) {
        case "time":
          return b.time - a.time;
        case "name":
          return a.title.localeCompare(b.title);
        case "recent":
          return b.lastActive - a.lastActive;
        default:
          return 0;
      }
    });

    tabsList.innerHTML = filteredTabs
      .map(
        (tab) => `
      <div class="tab-item ${tab.isActive ? "active" : ""} ${
          tab.isRunning ? "running" : ""
        }" data-tab-id="${tab.id}">
        <div class="tab-info">
          <div class="tab-favicon">
            <img src="${
              tab.favIconUrl ? tab.favIconUrl : "chrome://favicon/" + tab.url
            }" alt="favicon" onerror="this.style.display='none'">
          </div>
          <div class="tab-details">
            <div class="tab-title">
              ${this.truncateText(tab.title, 40)}
              ${tab.isActive ? '<span class="active-indicator">●</span>' : ""}
            </div>
            <div class="tab-url">${this.truncateText(tab.url, 50)}</div>
          </div>
        </div>
        
        <div class="tab-timer">
          <div class="timer-display ${
            tab.isRunning ? "running" : ""
          }">${this.formatTime(tab.time)}</div>
          <div class="timer-controls">
            <button class="timer-btn start-btn" data-tab-id="${tab.id}" ${
          tab.isRunning ? "disabled" : ""
        }>
              ${tab.isRunning ? "⏸️" : "▶️"}
            </button>
            <button class="timer-btn reset-btn" data-tab-id="${tab.id}">
              🔄
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  setupEventListeners() {
    // Global controls
    document
      .getElementById("start-all-btn")
      ?.addEventListener("click", () => this.startAllTimers());
    document
      .getElementById("stop-all-btn")
      ?.addEventListener("click", () => this.stopAllTimers());
    document
      .getElementById("reset-all-btn")
      ?.addEventListener("click", () => this.resetAllTimers());

    // Search and sort
    document
      .getElementById("search-tabs")
      ?.addEventListener("input", () => this.renderTabsList());
    document
      .getElementById("sort-tabs")
      ?.addEventListener("change", () => this.renderTabsList());

    // Footer buttons
    document
      .getElementById("export-data")
      ?.addEventListener("click", () => this.exportData());
    document
      .getElementById("clear-data")
      ?.addEventListener("click", () => this.clearAllData());

    // Tab-specific controls (delegated events)
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("start-btn")) {
        const tabId = parseInt(e.target.dataset.tabId);
        this.toggleTabTimer(tabId);
      } else if (e.target.classList.contains("reset-btn")) {
        const tabId = parseInt(e.target.dataset.tabId);
        this.resetTabTimer(tabId);
      }
    });

    // Listen for updates from background script
    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === "timerUpdate") {
        this.updateTabsFromBackground(request.timers);
      }
    });
  }

  startTimerLoop() {
    // Timer updates are now handled by the background script
    // This method is kept for compatibility but doesn't need to do anything
  }

  updateStats() {
    const totalTime = this.tabs.reduce((sum, tab) => sum + tab.time, 0);
    const runningTab = this.tabs.find((tab) => tab.isRunning);

    document.getElementById("total-time").textContent =
      this.formatTime(totalTime);
    document.getElementById("active-tabs").textContent = runningTab
      ? this.truncateText(runningTab.title, 20)
      : "None";
  }

  async saveTimers() {
    // Timer saving is now handled by the background script
    // This method is kept for compatibility but doesn't need to do anything
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  truncateText(text, maxLength) {
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }

  exportData() {
    const data = {
      exportDate: new Date().toISOString(),
      tabs: this.tabs.map((tab) => ({
        title: tab.title,
        url: tab.url,
        time: tab.time,
        formattedTime: this.formatTime(tab.time),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tab-timers-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async clearAllData() {
    if (
      confirm(
        "Are you sure you want to clear all timer data? This cannot be undone."
      )
    ) {
      this.tabs.forEach((tab) => {
        tab.time = 0;
        tab.isRunning = false;
      });

      await chrome.storage.local.remove(["tabTimers"]);
      this.renderTabsList();
      this.updateStats();
    }
  }

  updateTabsFromBackground(timers) {
    this.tabs.forEach((tab) => {
      if (timers[tab.id]) {
        tab.time = timers[tab.id].time || 0;
        tab.isRunning = timers[tab.id].isRunning || false;
      }
    });

    this.renderTabsList();
    this.updateStats();
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

  async stopAllTimers() {
    try {
      await chrome.runtime.sendMessage({ action: "stopAllTimers" });
    } catch (error) {
      console.error("Failed to stop all timers:", error);
    }
  }

  async resetAllTimers() {
    try {
      await chrome.runtime.sendMessage({ action: "resetAllTimers" });
    } catch (error) {
      console.error("Failed to reset all timers:", error);
    }
  }

  async toggleTabTimer(tabId) {
    try {
      const tab = this.tabs.find((t) => t.id === tabId);
      if (!tab) return;

      if (tab.isRunning) {
        await chrome.runtime.sendMessage({ action: "stopTabTimer", tabId });
      } else {
        await chrome.runtime.sendMessage({ action: "startTabTimer", tabId });
      }
    } catch (error) {
      console.error("Failed to toggle tab timer:", error);
    }
  }

  async resetTabTimer(tabId) {
    try {
      await chrome.runtime.sendMessage({ action: "resetTabTimer", tabId });
    } catch (error) {
      console.error("Failed to reset tab timer:", error);
    }
  }
}

// Initialize the app
new TabTimerApp();
