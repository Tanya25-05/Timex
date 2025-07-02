// src/background.js
// let timer = 0;
// let isRunning = false;
let tab = null;

chrome.action.onClicked.addListener(tab => {
    chrome.scripting.executeScript({
    target:{tabId:tab.id},
    func: () => {
        alert('Hello from my extension!')
    }
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

