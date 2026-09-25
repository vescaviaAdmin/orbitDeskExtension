
import { inviteBotController, getTranscriptController } from "../controllers/botOperationController.js";
import { saveTranscriptController } from "../controllers/transcriptOperationController.js";

function getMeetingBaasConfig(reply: any) {
    const apiUrl = process.env.MEETING_BAAS_BASEURL || "https://api.meetingbaas.com/v2/bots";
    const authKey = process.env.MEETING_BAAS_KEY;

    if (!authKey) {
        console.error("[MeetingBaaS] MEETING_BAAS_KEY is missing.");
        reply.code(500).send({ error: "MEETING_BAAS_KEY is missing in .env" });
        return null;
    }

    return { apiUrl, authKey };
}

async function inviteBotHandler(request: any, reply: any) {
    try {
        const meetingUrl = request.body?.meetingUrl;
        if (typeof meetingUrl !== "string" || !meetingUrl.trim()) {
            return reply.code(400).send({ error: "meetingUrl is required" });
        }

        const config = getMeetingBaasConfig(reply);
        if (!config) return;

        console.log("[Invite] Sending bot invitation request.");
        const result = await inviteBotController(meetingUrl, config);
        console.log(`[Invite] MeetingBaaS responded with status ${result.statusCode}.`);
        return reply.code(result.statusCode).send(result.body);
    } catch (error) {
        console.error("Error inviting bot:", error);
        return reply.code(500).send({ error: "Unable to invite bot" });
    }
}


async function getTranscriptHandler(request: any, reply: any)
{
    try {
        const botId = request.body?.botId;
        if (typeof botId !== "string" || !botId.trim()) {
            return reply.code(400).send({ error: "botId is required" });
        }

        const config = getMeetingBaasConfig(reply);
        if (!config) return;

        console.log(`[Transcript] Fetching bot details for ${botId}.`);
        const result = await getTranscriptController(botId, config);
        console.log(`[Transcript] MeetingBaaS responded with status ${result.statusCode}.`);
        return reply.code(result.statusCode).send(result.body);
    } catch (error) {
        console.error("Error getting transcript:", error);
        return reply.code(500).send({ error: "Unable to get transcript" });
    }
}


async function retryGetTranscript(request: any, reply: any) {
  try {
    const waitTime = Number(process.env.WAIT_TIME) || 30000;
    const numberOfRetries = Number(process.env.NUMBER_OF_RETRIES) || 10;

    const botId = request.body?.botId;

    if (typeof botId !== 'string' || !botId.trim()) {
      return reply.code(400).send({
        error: 'botId is required',
      });
    }

    const config = getMeetingBaasConfig(reply);

    if (!config) {
      return;
    }

    console.log(`[Retry] Starting transcript polling for bot ${botId}. Max attempts: ${numberOfRetries}; wait: ${waitTime}ms.`);

    for (let attempt = 1; attempt <= numberOfRetries; attempt += 1) {
      console.log(`[Retry] Attempt ${attempt}/${numberOfRetries}: fetching bot details.`);
      const result = await getTranscriptController(botId, config);
      console.log(`[Retry] Attempt ${attempt}/${numberOfRetries}: MeetingBaaS returned ${result.statusCode}.`);

      if (result.statusCode < 200 || result.statusCode >= 300) {
        console.error(`[Retry] Stopping because MeetingBaaS returned an error status: ${result.statusCode}.`);
        return reply.code(result.statusCode).send(result.body);
      }

      const transcription = result.body?.data?.transcription;

      if (transcription) {
        console.log(`[Retry] Transcript is ready on attempt ${attempt}. Saving it now.`);

        const savedTranscript = await saveTranscriptController(botId, transcription);
        console.log(savedTranscript.alreadySaved
          ? `[Retry] Transcript was already saved: ${savedTranscript.fileName}.`
          : `[Retry] Transcript saved: ${savedTranscript.fileName}.`);
        return reply.code(200).send({
          botId,
          transcription,
          fileName: savedTranscript.fileName,
          filePath: savedTranscript.filePath
        });
      }

      if (attempt < numberOfRetries) {
        console.log(`[Retry] Transcript is not ready. Waiting ${waitTime}ms before the next attempt.`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    console.log("[Retry] All retry attempts finished; transcript is still processing.");
    return reply.code(202).send({
      message: 'Transcript is still processing. Try again later.',
      botId,
    });
  } catch (error) {
    console.error('Error retrying transcript retrieval:', error);

    return reply.code(500).send({
      error: 'Unable to get transcript',
    });
  }
}

export { inviteBotHandler, getTranscriptHandler, retryGetTranscript};
