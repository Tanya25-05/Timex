
// // src/App.jsx
// import React, { useState, useEffect } from 'react';

// function App() {
//   const [isRunning, setIsRunning] = useState(false);
//   const [time, setTime] = useState(0);

//   useEffect(() => {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       const activeTab = tabs[0];
//       chrome.runtime.sendMessage({ action: 'getTime' }, (response) => {
//         if (response && response.time) {
//           setTime(response.time);
//           setIsRunning(true);
//         }
//       });
//     });

//     const messageListener = (request) => {
//       if (request.action === 'updateTime') {
//         setTime(request.time);
//       }
//     };

//     chrome.runtime.onMessage.addListener(messageListener);

//     return () => {
//       chrome.runtime.onMessage.removeListener(messageListener);
//     };
//   }, []);

//   const toggleTimer = () => {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       const activeTab = tabs[0];
//       if (isRunning) {
//         chrome.runtime.sendMessage({ action: 'stopTimer' });
//         setIsRunning(false);
//         setTime(0);
//       } else {
//         chrome.runtime.sendMessage({ action: 'startTimer', tabId: activeTab.id });
//         setIsRunning(true);
//       }
//     });
//   };

//   const formatTime = (seconds) => {
//     const hours = Math.floor(seconds / 3600);
//     const minutes = Math.floor((seconds % 3600) / 60);
//     const remainingSeconds = seconds % 60;
//     return `${hours.toString().padStart(2, '0')}:${minutes
//       .toString()
//       .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
//   };

//   return (
//     <div className="App">
//       <h1>Tab Timer</h1>
//       <div>{formatTime(time)}</div>
//       <button onClick={toggleTimer}>{isRunning ? 'Stop' : 'Start'}</button>
//     </div>
//   );
// }

// export default App;