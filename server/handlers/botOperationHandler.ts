
import { inviteBotController, getTranscriptController } from "../controllers/botOperationController.js";
import { saveTranscriptController } from "../controllers/transcriptOperationController.js";
import getMeetingBaasConfig from "../utils/getMeetingConfig.js";

async function inviteBotHandler(request: any, reply: any) {
    try {
        const meetingUrl = request.body?.meetingUrl;
        if (typeof meetingUrl !== "string" || !meetingUrl.trim()) {
            return reply.code(400).send({ error: "meetingUrl is required" });
        }

        const config = getMeetingBaasConfig(reply);
        if (!config) return;

        const result = await inviteBotController(meetingUrl, config);
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

        const result = await getTranscriptController(botId, config);
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

    for (let attempt = 1; attempt <= numberOfRetries; attempt += 1) {
      const result = await getTranscriptController(botId, config);

      if (result.statusCode < 200 || result.statusCode >= 300) {
        return reply.code(result.statusCode).send(result.body);
      }

      const transcription = result.body?.data?.transcription;

      if (transcription) {
        const savedTranscript = await saveTranscriptController(botId, transcription);
        return reply.code(200).send({
          botId,
          transcription,
          fileName: savedTranscript.fileName,
          filePath: savedTranscript.filePath
        });
      }

      if (attempt < numberOfRetries) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

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
