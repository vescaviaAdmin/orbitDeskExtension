const CAPTION_REGION_SELECTOR = '[role="region"][aria-label="Captions"]';
const CAPTION_ROW_SELECTOR = '.nMcdL.bj4p3b';
const SPEAKER_SELECTOR = '.NWpY1d';
const CAPTION_TEXT_SELECTOR = '.ygicle.VbkSUe';
const STABILITY_DELAY_MS = 900;

let isCapturing = false;
let observer = null;
let rowCounter = 0;

const rowIds = new WeakMap();
const pendingRows = new Map();
const committedRows = new Map();

function normalizeText(text) {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function getRowId(row) {
  let id = rowIds.get(row);

  if (!id) {
    rowCounter += 1;
    id = `caption-${rowCounter}`;
    rowIds.set(row, id);
  }

  return id;
}

function getCaptionRegion() {
  return document.querySelector(CAPTION_REGION_SELECTOR);
}

function parseCaptionRow(row) {
  const profileImage = row.querySelector('img[src]');
  const fallbackSpeaker = profileImage?.nextElementSibling;
  const fallbackText = profileImage?.parentElement?.nextElementSibling;
  const speaker = normalizeText(
    row.querySelector(SPEAKER_SELECTOR)?.textContent ?? fallbackSpeaker?.textContent
  );
  const text = normalizeText(
    row.querySelector(CAPTION_TEXT_SELECTOR)?.textContent ?? fallbackText?.textContent
  );

  if (!text) {
    return null;
  }

  return { speaker: speaker || 'Unknown', text };
}

function getCaptionRows(region) {
  const knownRows = [...region.querySelectorAll(CAPTION_ROW_SELECTOR)];

  if (knownRows.length > 0) {
    return knownRows;
  }

  const fallbackRows = new Set();

  region.querySelectorAll('img[src]').forEach((image) => {
    const textElement = image.parentElement?.nextElementSibling;
    const row = image.parentElement?.parentElement;

    if (row && normalizeText(textElement?.textContent)) {
      fallbackRows.add(row);
    }
  });

  return [...fallbackRows];
}

async function sendNewSegment(segmentId, caption) {
  await chrome.runtime.sendMessage({
    type: 'TRANSCRIPT_SEGMENT',
    segment: {
      id: segmentId,
      speaker: caption.speaker,
      text: caption.text,
      timestamp: new Date().toISOString()
    }
  });
}

async function updateSegment(segmentId, caption) {
  await chrome.runtime.sendMessage({
    type: 'UPDATE_TRANSCRIPT_SEGMENT',
    segment: {
      id: segmentId,
      speaker: caption.speaker,
      text: caption.text
    }
  });
}

async function commitRow(rowId, caption) {
  const previous = committedRows.get(rowId);

  if (!previous) {
    await sendNewSegment(rowId, caption);
    committedRows.set(rowId, caption);
    return;
  }

  if (previous.text !== caption.text || previous.speaker !== caption.speaker) {
    await updateSegment(rowId, caption);
    committedRows.set(rowId, caption);
  }
}

function scheduleRow(row, caption) {
  const rowId = getRowId(row);
  const existing = pendingRows.get(rowId);

  if (existing?.caption.text === caption.text && existing.caption.speaker === caption.speaker) {
    return;
  }

  if (existing) {
    clearTimeout(existing.timer);
  }

  const timer = setTimeout(() => {
    pendingRows.delete(rowId);
    commitRow(rowId, caption).catch((error) => {
      console.warn('Transcript Saver could not save a caption:', error);
    });
  }, STABILITY_DELAY_MS);

  pendingRows.set(rowId, { caption, timer });
}

function processCaptions() {
  if (!isCapturing) {
    return;
  }

  const region = getCaptionRegion();

  if (!region) {
    return;
  }

  getCaptionRows(region).forEach((row) => {
    const caption = parseCaptionRow(row);

    if (caption) {
      scheduleRow(row, caption);
    }
  });
}

function turnOnCaptions() {
  const button = document.querySelector(
    'button[aria-label="Turn on captions"], [role="button"][aria-label="Turn on captions"]'
  );

  button?.click();
}

function startCapture() {
  if (isCapturing) {
    return;
  }

  for (const { timer } of pendingRows.values()) {
    clearTimeout(timer);
  }

  pendingRows.clear();
  committedRows.clear();
  isCapturing = true;
  turnOnCaptions();
  processCaptions();

  observer = new MutationObserver(processCaptions);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

async function stopCapture() {
  observer?.disconnect();
  observer = null;

  const pending = [...pendingRows.entries()];
  pendingRows.clear();

  for (const [rowId, { caption, timer }] of pending) {
    clearTimeout(timer);
    await commitRow(rowId, caption);
  }

  isCapturing = false;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    startCapture();
    sendResponse({ started: true });
    return;
  }

  if (message.type === 'STOP_CAPTURE') {
    stopCapture()
      .then(() => sendResponse({ stopped: true }))
      .catch((error) => sendResponse({ error: error.message }));

    return true;
  }
});
