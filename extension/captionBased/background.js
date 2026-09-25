const SESSION_KEY = "transcriptSession";
const SAVE_URL = "http://localhost:3000/transcripts/save";

async function getSession() {
  const data = await chrome.storage.local.get(SESSION_KEY);
  return data[SESSION_KEY] ?? null;
}

async function saveSession(session) {
  await chrome.storage.local.set({
    [SESSION_KEY]: session
  });
}

async function clearSession() {
  await chrome.storage.local.remove(SESSION_KEY);
}

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tabs[0];
}

async function startRecording() {
  const tab = await getCurrentTab();

  if (!tab?.id || !tab.url?.startsWith("https://meet.google.com/")) {
    throw new Error("Open a Google Meet tab before starting recording.");
  }

  const session = {
    isRecording: true,
    tabId: tab.id,
    startedAt: new Date().toISOString(),
    segments: []
  };

  await saveSession(session);

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: "START_CAPTURE"
    });
  } catch {
    await clearSession();
    throw new Error("Reload the Google Meet tab, then try starting again.");
  }

  return {
    isRecording: true,
    message: "Recording started."
  };
}

async function addTranscriptSegment(segment, senderTabId) {
  const session = await getSession();

  if (
    !session?.isRecording ||
    session.tabId !== senderTabId ||
    !segment?.text?.trim()
  ) {
    return;
  }

  const text = segment.text.trim();

  if (segment.id && session.segments.some((savedSegment) => savedSegment.id === segment.id)) {
    return;
  }

  session.segments.push({
    id: segment.id,
    text,
    speaker: segment.speaker ?? "Unknown",
    timestamp: segment.timestamp ?? new Date().toISOString()
  });

  await saveSession(session);
}

async function updateTranscriptSegment(segment, senderTabId) {
  const session = await getSession();

  if (
    !session?.isRecording ||
    session.tabId !== senderTabId ||
    !segment?.id ||
    !segment?.text?.trim()
  ) {
    return;
  }

  const savedSegment = session.segments.find((item) => item.id === segment.id);

  if (!savedSegment) {
    return;
  }

  savedSegment.text = segment.text.trim();
  savedSegment.speaker = segment.speaker ?? savedSegment.speaker;

  await saveSession(session);
}

async function stopAndSaveRecording() {
  const session = await getSession();

  if (!session?.isRecording) {
    throw new Error("No recording is currently active.");
  }

  try {
    await chrome.tabs.sendMessage(session.tabId, {
      type: "STOP_CAPTURE"
    });
  } catch {
    // The Meet tab may already have been closed; save what was captured so far.
  }

  const latestSession = await getSession();

  const transcript = {
    source: "Google Meet",
    startedAt: latestSession?.startedAt ?? session.startedAt,
    endedAt: new Date().toISOString(),
    segmentCount: latestSession?.segments.length ?? session.segments.length,
    segments: (latestSession?.segments ?? session.segments).map(({ id, ...segment }) => segment)
  };

  const response = await fetch(SAVE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(transcript)
  });

  if (!response.ok) {
    throw new Error(`Server failed to save transcript: ${response.status}`);
  }

  const result = await response.json();

  await clearSession();

  return {
    isRecording: false,
    message: "Transcript saved.",
    fileName: result.fileName
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_RECORDING_STATUS") {
    getSession()
      .then((session) => {
        sendResponse({
          isRecording: session?.isRecording ?? false
        });
      })
      .catch((error) => {
        sendResponse({
          isRecording: false,
          error: error.message
        });
      });

    return true;
  }

  if (message.type === "START_RECORDING") {
    startRecording()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          isRecording: false,
          error: error.message
        });
      });

    return true;
  }

  if (message.type === "TRANSCRIPT_SEGMENT") {
    addTranscriptSegment(message.segment, sender.tab?.id)
      .then(() => sendResponse({ received: true }))
      .catch((error) => sendResponse({ error: error.message }));

    return true;
  }

  if (message.type === "UPDATE_TRANSCRIPT_SEGMENT") {
    updateTranscriptSegment(message.segment, sender.tab?.id)
      .then(() => sendResponse({ updated: true }))
      .catch((error) => sendResponse({ error: error.message }));

    return true;
  }

  if (message.type === "STOP_RECORDING") {
    stopAndSaveRecording()
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          isRecording: true,
          error: error.message
        });
      });

    return true;
  }
});
