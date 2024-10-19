
function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const ms = milliseconds % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${
    minutes.toString().padStart(2, '0')}:${
    seconds.toString().padStart(2, '0')}:${
    ms.toString().padStart(3, '0')}`;
}
let timerInterval;

document.addEventListener("DOMContentLoaded", function () {
  const toggleButton = document.getElementById("toggleButton");
  const currentTimer = document.getElementById("currentTimer");

  function updateCurrentTimer() {
    chrome.runtime.sendMessage(
      { action: "getCurrentTime" },
      function (response) {
        currentTimer.textContent = formatTime(response.currentTime);
      }
    );
  }

  // Check current tracking status
  chrome.runtime.sendMessage(
    { action: "getTrackingStatus" },
    function (response) {
      updateButtonState(response.isTracking);
      if (response.isTracking) {
        currentTimer.textContent = formatTime(response.currentTime);
        startTimerUpdate();
      }
    }
  );

  function startTimerUpdate() {
    clearInterval(timerInterval);
    timerInterval = setInterval(updateCurrentTimer, 10);
  }

  function stopTimerUpdate() {
    clearInterval(timerInterval);
    currentTimer.textContent = "00:00:00:00";
  }

  toggleButton.addEventListener("click", function () {
    const isCurrentlyTracking = toggleButton.classList.contains("tracking");
    const newTrackingState = !isCurrentlyTracking;

    chrome.runtime.sendMessage(
      {
        action: "toggleTracking",
        isTracking: newTrackingState,
      },
      function (response) {
        if (response.status === "success") {
          updateButtonState(newTrackingState);
          if (newTrackingState) {
            startTimerUpdate();
          } else {
            stopTimerUpdate();
          }
        }
      }
    );
  });

  function updateButtonState(isTracking) {
    if (isTracking) {
      toggleButton.textContent = "Stop Tracking";
      toggleButton.classList.remove("not-tracking");
      toggleButton.classList.add("tracking");
    } else {
      toggleButton.textContent = "Start Tracking";
      toggleButton.classList.remove("tracking");
      toggleButton.classList.add("not-tracking");
    }
  }

  // Display time data
  const today = new Date().toISOString().split("T")[0];
  chrome.storage.local.get([today], function (result) {
    const timeList = document.getElementById("timeList");
    const dailyData = result[today] || {};

    timeList.innerHTML = ""; // Clear existing list

    for (let url in dailyData) {
      const div = document.createElement("div");
      div.className = "site-time";

      const urlSpan = document.createElement("span");
      urlSpan.className = "url";
      urlSpan.textContent = url;

      const timeSpan = document.createElement("span");
      timeSpan.textContent = formatTime(dailyData[url]);

      div.appendChild(urlSpan);
      div.appendChild(timeSpan);
      timeList.appendChild(div);
    }
  });
});
