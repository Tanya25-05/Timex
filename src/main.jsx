import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let interval;

    if (isRunning) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime + 1000);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(0);
  };

  return (
    <div>
      <h1>Stopwatch Timer</h1>
      <p>
        {new Date(time).toISOString().slice(11, 19)}
      </p>
      <button onClick={handleStart}>Start</button>
      <button onClick={handleStop}>Stop</button>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
};

chrome.action.onClicked.addListener(async (tab) => {
  const root = ReactDOM.createRoot(document.createElement('div'));
  root.render(<App />);

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      const extensionDiv = document.createElement('div');
      extensionDiv.id = 'extension-root';
      document.body.appendChild(extensionDiv);
    },
  });

  chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    css: `
      extension-root {
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: white;
        padding: 20px;
        border: 1px solid #ccc;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        z-index: 9999;
      }
    `,
  });
});