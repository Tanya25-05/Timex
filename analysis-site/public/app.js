// Main Application JavaScript
class TimeAnalysisApp {
  constructor() {
    this.charts = {};
    this.analysisData = null;
    this.aiInsights = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.checkForExistingData();
  }

  setupEventListeners() {
    // File input change
    document.getElementById("file-input").addEventListener("change", (e) => {
      this.handleFileSelect(e.target.files[0]);
    });

    // Upload area click
    document.getElementById("upload-area").addEventListener("click", () => {
      document.getElementById("file-input").click();
    });
  }

  setupDragAndDrop() {
    const uploadArea = document.getElementById("upload-area");

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      uploadArea.addEventListener(eventName, () => {
        uploadArea.classList.remove("dragover");
      });
    });

    uploadArea.addEventListener("drop", (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileSelect(files[0]);
      }
    });
  }

  async checkForExistingData() {
    try {
      const response = await fetch("/api/analysis");
      if (response.ok) {
        const data = await response.json();
        this.analysisData = data;
        this.showAnalysis();
      }
    } catch (error) {
      console.log("No existing data found");
    }
  }

  async handleFileSelect(file) {
    if (!file || !file.name.endsWith(".json")) {
      this.showError(
        "Please select a valid JSON file exported from the Chrome extension."
      );
      return;
    }

    this.showUploadStatus();

    try {
      const formData = new FormData();
      formData.append("data", file);

      const response = await fetch("/api/import-data", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload data");
      }

      const result = await response.json();
      this.showSuccess("Data imported successfully!");

      // Load analysis data
      await this.loadAnalysisData();
    } catch (error) {
      console.error("Upload error:", error);
      this.showError("Failed to upload data. Please try again.");
    } finally {
      this.hideUploadStatus();
    }
  }

  async loadAnalysisData() {
    try {
      const response = await fetch("/api/analysis");
      if (response.ok) {
        this.analysisData = await response.json();
        this.showAnalysis();
      }
    } catch (error) {
      console.error("Failed to load analysis:", error);
      this.showError("Failed to load analysis data.");
    }
  }

  showAnalysis() {
    document.getElementById("import-section").style.display = "none";
    document.getElementById("analysis-section").style.display = "block";

    this.updateSummaryCards();
    this.createCharts();
    this.updateCategoryBreakdown();
    this.loadRecommendations();
    this.loadAIInsights();
  }

  updateSummaryCards() {
    const { summary } = this.analysisData;

    document.getElementById("total-time").textContent = this.formatTime(
      summary.totalTime
    );
    document.getElementById("total-sites").textContent = summary.totalSites;
    document.getElementById("total-categories").textContent =
      summary.categories;
    document.getElementById("avg-time").textContent = this.formatTime(
      summary.avgTimePerSite
    );
  }

  createCharts() {
    this.createCategoryChart();
    this.createSitesChart();
  }

  createCategoryChart() {
    const ctx = document.getElementById("category-chart").getContext("2d");

    if (this.charts.categoryChart) {
      this.charts.categoryChart.destroy();
    }

    const { timeDistribution } = this.analysisData;

    this.charts.categoryChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: timeDistribution.map((item) => item.category),
        datasets: [
          {
            data: timeDistribution.map((item) => item.time),
            backgroundColor: this.generateColors(timeDistribution.length),
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = timeDistribution[context.dataIndex];
                return `${item.category}: ${this.formatTime(
                  item.time
                )} (${item.percentage.toFixed(1)}%)`;
              },
            },
          },
        },
      },
    });
  }

  createSitesChart() {
    const ctx = document.getElementById("sites-chart").getContext("2d");

    if (this.charts.sitesChart) {
      this.charts.sitesChart.destroy();
    }

    const { topSites } = this.analysisData;
    const sites = topSites.slice(0, 10); // Show top 10 sites

    this.charts.sitesChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sites.map((site) => this.truncateText(site.title, 20)),
        datasets: [
          {
            label: "Time Spent",
            data: sites.map((site) => site.time),
            backgroundColor: "rgba(102, 126, 234, 0.8)",
            borderColor: "rgba(102, 126, 234, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatTime(value),
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const site = sites[context.dataIndex];
                return `${site.title}: ${this.formatTime(site.time)}`;
              },
            },
          },
        },
      },
    });
  }

  updateCategoryBreakdown() {
    const { categoryBreakdown } = this.analysisData;
    const categoryList = document.getElementById("category-list");

    const sortedCategories = Object.entries(categoryBreakdown).sort(
      ([, a], [, b]) => b.totalTime - a.totalTime
    );

    categoryList.innerHTML = sortedCategories
      .map(([category, data]) => {
        const percentage =
          (data.totalTime / this.analysisData.summary.totalTime) * 100;
        return `
                <div class="category-item">
                    <div class="category-info">
                        <h4>${category}</h4>
                        <p>${data.count} sites visited</p>
                    </div>
                    <div class="category-stats">
                        <div class="time">${this.formatTime(
                          data.totalTime
                        )}</div>
                        <div class="percentage">${percentage.toFixed(
                          1
                        )}% of total time</div>
                    </div>
                </div>
            `;
      })
      .join("");
  }

  async loadRecommendations() {
    try {
      const response = await fetch("/api/recommendations");
      if (response.ok) {
        const recommendations = await response.json();
        this.displayRecommendations(recommendations);
      }
    } catch (error) {
      console.error("Failed to load recommendations:", error);
    }
  }

  async loadAIInsights() {
    try {
      const response = await fetch("/api/ai-insights");
      if (response.ok) {
        this.aiInsights = await response.json();
        this.displayAIInsights();
      }
    } catch (error) {
      console.error("Failed to load AI insights:", error);
      this.showError("Failed to load AI insights. Please try again.");
    }
  }

  displayAIInsights() {
    if (!this.aiInsights) return;

    const insightsContainer = document.getElementById("ai-insights-container");
    if (!insightsContainer) return;

    insightsContainer.innerHTML = `
      <div class="insights-section">
        <h3>🧠 AI-Powered Insights</h3>
        
        <div class="insight-card">
          <h4>📊 Behavioral Patterns</h4>
          <p>${
            this.aiInsights.behavioralPatterns || "Analysis not available"
          }</p>
        </div>

        <div class="insight-card">
          <h4>⚡ Productivity Score</h4>
          <p>${
            this.aiInsights.productivityScore || "Analysis not available"
          }</p>
        </div>

        <div class="insight-card">
          <h4>⏰ Time Management</h4>
          <p>${this.aiInsights.timeManagement || "Analysis not available"}</p>
        </div>

        <div class="insight-card">
          <h4> Digital Wellness</h4>
          <p>${this.aiInsights.digitalWellness || "Analysis not available"}</p>
        </div>

        <div class="insight-card">
          <h4>💡 Specific Insights</h4>
          <div class="specific-insights">
            ${(this.aiInsights.specificInsights || [])
              .map(
                (insight) => `
              <div class="specific-insight">
                <h5>${insight.title}</h5>
                <p>${insight.description}</p>
                <div class="action">🎯 ${insight.action}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  displayRecommendations(recommendations) {
    const grid = document.getElementById("recommendations-grid");
    if (!grid) return;

    grid.innerHTML = recommendations
      .map(
        (rec) => `
            <div class="recommendation-card ${rec.type}">
                <div class="recommendation-icon">
                    ${this.getRecommendationIcon(rec.type)}
                </div>
                <div class="recommendation-content">
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                    <div class="action">🎯 ${rec.action}</div>
                    ${
                      rec.priority
                        ? `<div class="priority ${rec.priority}">Priority: ${rec.priority}</div>`
                        : ""
                    }
                </div>
            </div>
        `
      )
      .join("");
  }

  getRecommendationIcon(type) {
    const icons = {
      warning: "⚠️",
      info: "ℹ️",
      tip: "💡",
      success: "✅",
    };
    return icons[type] || "💡";
  }

  generateColors(count) {
    const colors = [
      "#667eea",
      "#764ba2",
      "#f093fb",
      "#f5576c",
      "#4facfe",
      "#00f2fe",
      "#43e97b",
      "#38f9d7",
      "#fa709a",
      "#fee140",
      "#a8edea",
      "#fed6e3",
      "#ffecd2",
      "#fcb69f",
      "#ff9a9e",
      "#fecfef",
    ];

    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  formatTime(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  showUploadStatus() {
    document.getElementById("upload-status").style.display = "block";
    document.getElementById("upload-area").style.display = "none";
  }

  hideUploadStatus() {
    document.getElementById("upload-status").style.display = "none";
    document.getElementById("upload-area").style.display = "block";
  }

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showNotification(message, type) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${
                  type === "success"
                    ? "fa-check-circle"
                    : "fa-exclamation-circle"
                }"></i>
                <span>${message}</span>
            </div>
        `;

    // Add styles
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === "success" ? "#48bb78" : "#f56565"};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 5000);
  }
}

// Add CSS animations for notifications
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new TimeAnalysisApp();
});
