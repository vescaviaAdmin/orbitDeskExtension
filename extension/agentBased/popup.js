const statusElement = document.getElementById("status");

async function showStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://meet.google.com/")) {
    statusElement.textContent = "Open a Google Meet meeting to use the Notetaker.";
    return;
  }

  const status = await chrome.runtime.sendMessage({ type: "GET_STATUS", tabId: tab.id });
  statusElement.textContent = status?.message || "Ready to record this meeting.";
}

showStatus().catch(() => {
  statusElement.textContent = "Refresh the Google Meet page after installing the extension.";
});
