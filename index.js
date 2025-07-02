async function index() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); // queries list of tabs and then find the one i.e active
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      alert("Hello this is my first extension");
    },
  });
}

document.getElementById("mybutton").addEventListener("click", index);
