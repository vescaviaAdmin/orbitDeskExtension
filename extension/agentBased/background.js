const SERVER_BASE_URL = "http://localhost:3000";
const AGENTS_API_URL = `${SERVER_BASE_URL}/agents`;
const MEETINGS_API_URL = `${SERVER_BASE_URL}/meetings`;
const meetingStates = new Map();
const meetingSaveRequests = new Set();

async function postJson(path, body, baseUrl) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || `Server returned ${response.status}`);
  }

  return data;
}

async function fetchAllProjects() {
  const response = await fetch(`${SERVER_BASE_URL}/projects/fetchAllProject`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Server returned ${response.status}`);
  }

  return data.projects;
}

function sendStatus(tabId, status, message) {
  const state = meetingStates.get(tabId);
  if (state) {
    state.status = status;
    state.message = message;
  }

  chrome.tabs.sendMessage(tabId, { type: "STATUS_CHANGED", status, message }).catch(() => {});
}

async function inviteAgent(tabId, meetingUrl) {
  try {
    sendStatus(tabId, "inviting", "Inviting orbitDesk Notetaker…");

    const result = await postJson("/invite", { meetingUrl }, AGENTS_API_URL);
    const agentId = result.data?.agent_id || result.agent_id || result.data?.bot_id || result.bot_id || result.data?.id;

    if (!agentId) {
      throw new Error("The invite response did not include an agent ID.");
    }


    const state = meetingStates.get(tabId);
    if (state) state.agentId = agentId;

    await chrome.storage.session.set({ [`orbitDeskAgent:${tabId}`]: agentId });
    sendStatus(tabId, "recording", "Notetaker invited. Recording will be processed after the meeting.");
  } catch (error) {
    console.error("[orbitDesk] agent invitation failed:", error);
    sendStatus(tabId, "error", error.message || "Unable to invite the notetaker.");
  }
}

async function startRecording(tabId, meetingUrl, projectId) {
  const state = meetingStates.get(tabId);
  if (state) state.projectId = projectId;

  await chrome.storage.session.set({ [`orbitDeskProject:${tabId}`]: projectId });
  await inviteAgent(tabId, meetingUrl);
}

async function retrieveAndSaveTranscript(tabId) {
  const state = meetingStates.get(tabId);
  const agentStorageKey = `orbitDeskAgent:${tabId}`;
  const projectStorageKey = `orbitDeskProject:${tabId}`;
  const saveStorageKey = `orbitDeskMeetingSave:${tabId}`;
  const saved = await chrome.storage.session.get([agentStorageKey, projectStorageKey]);
  const agentId = state?.agentId || saved[agentStorageKey];
  const projectId = state?.projectId || saved[projectStorageKey];

  if (!agentId || !projectId || state?.transcriptRequested || meetingSaveRequests.has(tabId)) {
    return;
  }

  meetingSaveRequests.add(tabId);
  const previousSave = await chrome.storage.session.get(saveStorageKey);
  if (previousSave[saveStorageKey]) return;

  await chrome.storage.session.set({ [saveStorageKey]: true });
  if (state) state.transcriptRequested = true;

  try {
    sendStatus(tabId, "processing", "Meeting ended. Waiting for the transcript…");

    const meetingResult = await postJson("/save", { agentId, projectId }, MEETINGS_API_URL);

    if (!meetingResult.meeting) {
      sendStatus(tabId, "processing", meetingResult.message || "Transcript is still processing.");
      return;
    }

    sendStatus(tabId, "saved", "Transcript is ready and has been saved.");
  } catch (error) {
    console.error("[orbitDesk] Transcript retrieval failed:", error);
    sendStatus(tabId, "error", error.message || "Unable to retrieve the transcript.");
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.type === "MEET_OPENED" && tabId !== undefined) {
    const previousState = meetingStates.get(tabId);

    if (!previousState || previousState.meetingUrl !== message.meetingUrl) {
      meetingStates.set(tabId, {
        meetingUrl: message.meetingUrl,
        status: "ready",
        message: ""
      });
      chrome.tabs.sendMessage(tabId, { type: "SHOW_RECORDING_PROMPT" }).catch(() => {});
    }
  }

  if (message.type === "START_RECORDING" && tabId !== undefined) {
    void startRecording(tabId, message.meetingUrl, message.projectId);
  }

  if (message.type === "GET_PROJECTS") {
    fetchAllProjects()
      .then((projects) => sendResponse({ projects }))
      .catch((error) => sendResponse({ error: error.message || "Unable to load projects" }));

    return true;
  }

  if (message.type === "MEETING_ENDED" && tabId !== undefined) {
    retrieveAndSaveTranscript(tabId);
  }

  if (message.type === "GET_STATUS") {
    const requestedTabId = tabId ?? message.tabId;
    const state = meetingStates.get(requestedTabId) || { status: "idle", message: "Open a Google Meet meeting to begin." };
    sendResponse(state);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const state = meetingStates.get(tabId);
    const agentStorageKey = `orbitDeskAgent:${tabId}`;
    const projectStorageKey = `orbitDeskProject:${tabId}`;
    const saveStorageKey = `orbitDeskMeetingSave:${tabId}`;
    const saved = await chrome.storage.session.get([agentStorageKey, projectStorageKey]);
    const agentId = state?.agentId || saved[agentStorageKey];
    const projectId = state?.projectId || saved[projectStorageKey];

    if (agentId && projectId && !state?.transcriptRequested) {
      await retrieveAndSaveTranscript(tabId);
    }

    meetingStates.delete(tabId);
    meetingSaveRequests.delete(tabId);
    await chrome.storage.session.remove([agentStorageKey, projectStorageKey, saveStorageKey]);
  })().catch((error) => {
    console.error(`[orbitDesk] Unable to process tab ${tabId} closing:`, error);
  });
});
