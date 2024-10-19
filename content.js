// import React, { useState, useEffect } from 'react';
// import ReactDOM from 'react-dom/client';

// const Timer = () => {
//   const [isRunning, setIsRunning] = useState(false);
//   const [time, setTime] = useState(0);

//   useEffect(() => {
//     let interval;
//     if (isRunning) {
//       interval = setInterval(() => {
//         setTime((prevTime) => prevTime + 1000);
//       }, 1000);
//     }
//     return () => clearInterval(interval);
//   }, [isRunning]);

//   const handleStart = () => setIsRunning(true);
//   const handleStop = () => setIsRunning(false);
//   const handleReset = () => {
//     setIsRunning(false);
//     setTime(0);
//   };

//   return React.createElement(
//     'div',
//     { className: 'timer-card' },
//     React.createElement('h3', null, 'Stopwatch'),
//     React.createElement('p', null, new Date(time).toISOString().slice(11, 19)),
//     React.createElement('button', { onClick: handleStart }, 'Start'),
//     React.createElement('button', { onClick: handleStop }, 'Stop'),
//     React.createElement('button', { onClick: handleReset }, 'Reset')
//   );
// };

// const root = document.createElement('div');
// root.id = 'extension-root';
// document.body.appendChild(root);

// const timerRoot = ReactDOM.createRoot(root);

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === 'startTimer') {
//     timerRoot.render(React.createElement(Timer));
//   }
// });
