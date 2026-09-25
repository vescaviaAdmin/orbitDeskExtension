const API_BASE_URL = "http://localhost:3000/transcripts";
const meetingStates = new Map();

async function postJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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

function sendStatus(tabId, status, message) {
  const state = meetingStates.get(tabId);
  if (state) {
    state.status = status;
    state.message = message;
  }

  chrome.tabs.sendMessage(tabId, { type: "STATUS_CHANGED", status, message }).catch(() => {});
}

async function inviteBot(tabId, meetingUrl) {
  try {
    sendStatus(tabId, "inviting", "Inviting orbitDesk Notetaker…");

    const result = await postJson("/inviteBot", { meetingUrl });
    const botId = result.data?.bot_id || result.bot_id || result.data?.id;

    if (!botId) {
      throw new Error("The invite response did not include a bot ID.");
    }


    const state = meetingStates.get(tabId);
    if (state) state.botId = botId;

    await chrome.storage.session.set({ [`orbitDeskBot:${tabId}`]: botId });
    sendStatus(tabId, "recording", "Notetaker invited. Recording will be processed after the meeting.");
  } catch (error) {
    console.error("[orbitDesk] Bot invitation failed:", error);
    sendStatus(tabId, "error", error.message || "Unable to invite the notetaker.");
  }
}

async function retrieveAndSaveTranscript(tabId) {
  const state = meetingStates.get(tabId);
  const saved = await chrome.storage.session.get(`orbitDeskBot:${tabId}`);
  const botId = state?.botId || saved[`orbitDeskBot:${tabId}`];

  if (!botId || state?.transcriptRequested) {
    return;
  }
  if (state) state.transcriptRequested = true;

  try {
    sendStatus(tabId, "processing", "Meeting ended. Waiting for the transcript…");

    const transcriptResult = await postJson("/retry", { botId });

    if (!transcriptResult.transcription) {
      sendStatus(tabId, "processing", transcriptResult.message || "Transcript is still processing.");
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
    inviteBot(tabId, message.meetingUrl);
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
    const storageKey = `orbitDeskBot:${tabId}`;
    const saved = await chrome.storage.session.get(storageKey);
    const botId = state?.botId || saved[storageKey];

    if (botId && !state?.transcriptRequested) {
      await retrieveAndSaveTranscript(tabId);
    }

    meetingStates.delete(tabId);
    await chrome.storage.session.remove(storageKey);
  })().catch((error) => {
    console.error(`[orbitDesk] Unable to process tab ${tabId} closing:`, error);
  });
});
