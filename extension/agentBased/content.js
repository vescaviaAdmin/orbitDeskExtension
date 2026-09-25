let promptShown = false;
let meetingEnded = false;
let wasInMeeting = false;
let missingLeaveButtonChecks = 0;
let noticeTimeout;

function createNotice(message, isError = false) {
  let notice = document.getElementById("orbitdesk-notice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "orbitdesk-notice";
    Object.assign(notice.style, {
      position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: "2147483647",
      padding: "12px 16px", borderRadius: "8px", color: "white",
      fontFamily: "Arial, sans-serif", fontSize: "14px", maxWidth: "320px"
    });
    document.body.appendChild(notice);
  }
  notice.style.background = isError ? "#b3261e" : "#1f6f43";
  notice.textContent = message;

  clearTimeout(noticeTimeout);
  noticeTimeout = setTimeout(() => notice.remove(), isError ? 8000 : 4000);
}

async function showRecordingPrompt() {
  if (promptShown || document.getElementById("orbitdesk-recording-prompt")) return;
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

  const projectLabel = document.createElement("label");
  projectLabel.textContent = "Project";
  Object.assign(projectLabel.style, { display: "block", margin: "16px 0 6px", fontWeight: "600" });

  const projectSelect = document.createElement("select");
  projectSelect.disabled = true;
  Object.assign(projectSelect.style, {
    width: "100%", marginBottom: "16px", padding: "10px", border: "1px solid #dadce0",
    borderRadius: "6px", fontSize: "14px", boxSizing: "border-box"
  });

  const loadingOption = new Option("Loading projects…", "");
  projectSelect.add(loadingOption);

  const startButton = document.createElement("button");
  startButton.textContent = "Yes, start recording";
  startButton.disabled = true;
  Object.assign(startButton.style, { marginRight: "10px", padding: "10px 14px", border: "0", borderRadius: "6px", background: "#1a73e8", color: "white", cursor: "pointer" });
  startButton.addEventListener("click", () => {
    const projectId = projectSelect.value;
    if (!projectId) return;

    console.log("[orbitDesk] Project selected for recording.", { projectId });
    overlay.remove();
    chrome.runtime.sendMessage({ type: "START_RECORDING", meetingUrl: location.href, projectId });
  });

  const cancelButton = document.createElement("button");
  cancelButton.textContent = "No thanks";
  Object.assign(cancelButton.style, { padding: "10px 14px", border: "0", borderRadius: "6px", background: "#e8eaed", color: "#202124", cursor: "pointer" });
  cancelButton.addEventListener("click", () => {
    overlay.remove();
  });

  dialog.append(projectLabel, projectSelect, startButton, cancelButton);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const response = await chrome.runtime.sendMessage({ type: "GET_PROJECTS" });
  if (response?.error) {
    projectSelect.options[0].text = "Unable to load projects";
    return;
  }

  const projects = Array.isArray(response?.projects) ? response.projects : [];
  projectSelect.replaceChildren(new Option("Select a project", ""));

  for (const project of projects) {
    projectSelect.add(new Option(project.name, project.id));
  }

  if (projects.length === 0) {
    projectSelect.options[0].text = "No projects available";
    return;
  }

  projectSelect.disabled = false;
  startButton.disabled = false;
}

function isLeaveMeetingControl(element) {
  const label = [
    element?.getAttribute("aria-label"),
    element?.getAttribute("data-tooltip")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return label.includes("leave call") || label.includes("leave meeting");
}

function hasLeaveMeetingControl() {
  return [...document.querySelectorAll("[aria-label], [data-tooltip]")]
    .some((element) => isLeaveMeetingControl(element));
}

function notifyMeetingEnded() {
  if (meetingEnded) return;

  meetingEnded = true;
  chrome.runtime.sendMessage({ type: "MEETING_ENDED" });
}

function watchForMeetingEnd() {
  const leaveButtonVisible = hasLeaveMeetingControl();

  if (leaveButtonVisible) {
    wasInMeeting = true;
    missingLeaveButtonChecks = 0;
    return;
  }

  if (wasInMeeting) missingLeaveButtonChecks += 1;

  if (wasInMeeting && missingLeaveButtonChecks >= 1) {
    notifyMeetingEnded();
  }
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element
    ? event.target.closest("[aria-label], [data-tooltip]")
    : null;

  if (target && isLeaveMeetingControl(target)) {
    notifyMeetingEnded();
  }
}, true);

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_RECORDING_PROMPT") void showRecordingPrompt();
  if (message.type === "STATUS_CHANGED") createNotice(message.message, message.status === "error");
});

chrome.runtime.sendMessage({ type: "MEET_OPENED", meetingUrl: location.href });
setInterval(watchForMeetingEnd, 3000);
