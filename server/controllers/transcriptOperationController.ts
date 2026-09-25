import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFilePath);
const transcriptsDirectory = resolve(currentDirectory, "../../transcripts");


async function normalizeTranscript(transcription: any) {
  if (!transcription) {
    throw new Error('Transcription URL is missing');
  }

  const response = await fetch(transcription);
  if (!response.ok) {
    throw new Error(`Unable to download transcript: ${response.status} ${response.statusText}`);
  }

  const transcriptData = await response.json();
  const utterances = transcriptData?.result?.utterances;
  if (!Array.isArray(utterances)) {
    throw new Error("Transcript response does not contain result.utterances");
  }

  return {
    utterances: utterances.map((utterance: any) => ({
      speaker: utterance?.speaker ?? "Unknown",
      text: utterance?.text ?? ""
    }))
  };
}
async function saveTranscriptController(botId : any, transcription: any) {
    await mkdir(transcriptsDirectory, { recursive: true });

    const safeBotId = String(botId).replace(/[^a-zA-Z0-9-]/g, "_");
    const fileName = `transcript-${safeBotId}.json`;
    const filePath = resolve(transcriptsDirectory, fileName);

    try {
      await access(filePath);
      return { fileName, filePath, alreadySaved: true };
    } catch {
    }

    const normalizedTranscript = await normalizeTranscript(transcription);

    await writeFile(
      filePath,
      JSON.stringify({ botId, ...normalizedTranscript }, null, 2),
      "utf8"
    );

    return { fileName, filePath, alreadySaved: false };
}

export { saveTranscriptController };
