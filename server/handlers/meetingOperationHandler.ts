import { saveMeetingController, normalizeTranscript } from "../controllers/meetingOperationController.js";
import getMeetingBaasConfig from "../utils/getMeetingConfig.js";
import retryFetchTranscript from "../utils/retryFetchTranscript.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function saveMeetingHandler(request: any, reply: any) {
  const agentId = request.body?.agentId;
  const projectId = request.body?.projectId;

  if (typeof agentId !== 'string' || !agentId.trim()) {
    return reply.code(400).send({ error: 'agentId is required' });
  }

  if (typeof projectId !== 'string' || !uuidPattern.test(projectId.trim())) {
    return reply.code(400).send({ error: 'projectId must be a valid UUID' });
  }

  const config = getMeetingBaasConfig(reply);
  if (!config) return;

  const normalizedAgentId = agentId.trim();
  const normalizedProjectId = projectId.trim();
  const retryResult = await retryFetchTranscript(normalizedAgentId, config);

  if (retryResult.status === 'pending') {
    return reply.code(202).send({
      message: 'Transcript is still processing. Try again later.',
      agentId: normalizedAgentId,
      attempts: retryResult.attempts,
    });
  }

  if (retryResult.status === 'provider_error') {
    console.error('[Meetings] Transcript provider returned an error.', { providerStatus: retryResult.providerStatus });
    return reply.code(502).send({
      error: 'Transcript provider returned an error',
      providerStatus: retryResult.providerStatus,
    });
  }

  if (retryResult.status === 'request_error') {
    console.error('[Meetings] Transcript provider could not be reached.');
    return reply.code(502).send({ error: 'Unable to reach the transcript provider' });
  }

  let normalizedTranscript: string;
  try {
    normalizedTranscript = await normalizeTranscript(retryResult.transcription);
  } catch (error: any) {
    console.error('[Meetings] Failed to normalize transcript.', error);
    return reply.code(502).send({ error: 'Unable to process transcript from provider' });
  }

  try {
    const meeting = await saveMeetingController(
      normalizedProjectId,
      normalizedTranscript
    );

    return reply.code(201).send({ meeting, transcript: normalizedTranscript, attempts: retryResult.attempts });
  } catch (error: any) {
    if (error?.code === '23503') {
      return reply.code(404).send({ error: 'Project not found' });
    }

    console.error('[Meetings] Failed to save meeting.', error);
    return reply.code(500).send({ error: 'Unable to save meeting' });
  }
}

export { saveMeetingHandler };
