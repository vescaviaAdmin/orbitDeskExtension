let promptShown = false;
let meetingEnded = false;
let wasInMeeting = false;
let missingLeaveButtonChecks = 0;

function createNotice(message, isError = false) {
  let notice = document.getElementById("orbitdesk-notice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "orbitdesk-notice";
    Object.assign(notice.style, {
      position: "fixed", bottom: "20px", right: "20px", zIndex: "2147483647",
      padding: "12px 16px", borderRadius: "8px", color: "white",
      fontFamily: "Arial, sans-serif", fontSize: "14px", maxWidth: "320px"
    });
    document.body.appendChild(notice);
  }
  notice.style.background = isError ? "#b3261e" : "#1f6f43";
  notice.textContent = message;
}

function showRecordingPrompt() {
  if (promptShown || document.getElementById("orbitdesk-recording-prompt")) return;
  console.log("[orbitDesk] Showing recording confirmation dialog.");
  promptShown = true;

  const overlay = document.createElement("div");
  overlay.id = "orbitdesk-recording-prompt";
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", zIndex: "2147483647", display: "grid",
    placeItems: "center", background: "rgba(0, 0, 0, 0.45)", fontFamily: "Arial, sans-serif"
  });

  const dialog = document.createElement("div");
  Object.assign(dialog.style, {
    width: "min(400px, calc(100vw - 32px))", padding: "24px", borderRadius: "12px",
    background: "#fff", color: "#202124", boxShadow: "0 10px 30px rgba(0,0,0,.25)"
  });
  dialog.innerHTML = "<h2 style='margin:0 0 12px;font-size:20px'>Record this meeting?</h2><p style='line-height:1.5'>orbitDesk will invite the Notetaker to this Google Meet. The transcript will be saved after the meeting ends.</p>";

  const startButton = document.createElement("button");
  startButton.textContent = "Yes, start recording";
  Object.assign(startButton.style, { marginRight: "10px", padding: "10px 14px", border: "0", borderRadius: "6px", background: "#1a73e8", color: "white", cursor: "pointer" });
  startButton.addEventListener("click", () => {
    console.log("[orbitDesk] User selected: start recording.");
    overlay.remove();
    chrome.runtime.sendMessage({ type: "START_RECORDING", meetingUrl: location.href });
  });

  const cancelButton = document.createElement("button");
  cancelButton.textContent = "No thanks";
  Object.assign(cancelButton.style, { padding: "10px 14px", border: "0", borderRadius: "6px", background: "#e8eaed", color: "#202124", cursor: "pointer" });
  cancelButton.addEventListener("click", () => {
    console.log("[orbitDesk] User selected: no thanks.");
    overlay.remove();
  });

  dialog.append(startButton, cancelButton);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}

function hasLeaveCallButton() {
  return [...document.querySelectorAll("[aria-label]")]
    .some((element) => element.getAttribute("aria-label")?.toLowerCase().includes("leave call"));
}

function watchForMeetingEnd() {
  const leaveButtonVisible = hasLeaveCallButton();

  if (leaveButtonVisible) {
    if (!wasInMeeting) console.log("[orbitDesk] Meet call controls detected. Watching for meeting end.");
    wasInMeeting = true;
    missingLeaveButtonChecks = 0;
    return;
  }

  if (wasInMeeting) missingLeaveButtonChecks += 1;

  if (wasInMeeting && missingLeaveButtonChecks >= 3 && !meetingEnded) {
    meetingEnded = true;
    console.log("[orbitDesk] Meeting-end detected: Leave call button disappeared.");
    chrome.runtime.sendMessage({ type: "MEETING_ENDED" });
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_RECORDING_PROMPT") showRecordingPrompt();
  if (message.type === "STATUS_CHANGED") createNotice(message.message, message.status === "error");
});

console.log("[orbitDesk] Google Meet content script loaded.");
chrome.runtime.sendMessage({ type: "MEET_OPENED", meetingUrl: location.href });
setInterval(watchForMeetingEnd, 3000);
