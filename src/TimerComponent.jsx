// TimerComponent.jsx (Popup)
import React, { useEffect, useState } from "react";

const TimerComponent = () => {
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const handleMessage = (request) => {
      if (request.action === "updateTime") {
        setTimer(request.time);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    chrome.runtime.sendMessage({ action: "getTime" }, (response) => {
      if (response && response.time) {
        setTimer(response.time);
        setIsRunning(true);
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const startTimer = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({ action: "startTimer", tabId: tabs[0].id });
      setIsRunning(true);
    });
  };

  const stopTimer = () => {
    chrome.runtime.sendMessage({ action: "stopTimer" });
    setIsRunning(false);
    setTimer(0);
  };

  return (
    <div>
      <h1>Timer: {timer} seconds</h1>
      <button onClick={startTimer} disabled={isRunning}>
        Start Timer
      </button>
      <button onClick={stopTimer} disabled={!isRunning}>
        Stop Timer
      </button>
    </div>
  );
};

export default TimerComponent;
