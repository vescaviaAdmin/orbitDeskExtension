import { saveMeeting } from "../dbQueries/neonQueries.js";


async function saveMeetingController(projectId: string, transcript: string) {
  return saveMeeting(projectId, transcript);
}

async function normalizeTranscript(transcription: any) {
  if (!transcription) {
    throw new Error("Transcription URL is missing");
  }

  const response = await fetch(transcription);

  if (!response.ok) {
    throw new Error(
      `Unable to download transcript: ${response.status} ${response.statusText}`
    );
  }

  const transcriptData = await response.json();
  const utterances = transcriptData?.result?.utterances;

  if (!Array.isArray(utterances)) {
    throw new Error("Transcript response does not contain result.utterances");
  }

  return utterances
    .map((utterance: any) => String(utterance?.text ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
}



export { saveMeetingController, normalizeTranscript };
