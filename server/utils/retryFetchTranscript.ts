import { getTranscriptController } from "../controllers/agentOperationController.js";

const waitTime = Number(process.env.WAIT_TIME) || 30000;
const numberOfRetries = Number(process.env.NUMBER_OF_RETRIES) || 10;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function retryFetchTranscript(agentId: string, config: any) {
  for (let attempt = 1; attempt <= numberOfRetries; attempt += 1) {
    try {
      console.log(`[Retry] Fetching transcript: attempt ${attempt}/${numberOfRetries}.`);
      const result = await getTranscriptController(agentId, config);

      if (result.statusCode < 200 || result.statusCode >= 300) {
        console.error(`[Retry] Status returned ${result.statusCode}.`);

        return {
          status: "provider_error",
          providerStatus: result.statusCode,
          body: result.body,
          attempts: attempt,
        };
      }

      const transcription = result.body?.data?.transcription;

      if (typeof transcription === "string" && transcription.trim()) {
        return {
          status: "ready",
          transcription,
          attempts: attempt,
        };
      }
    } catch (error) {
      console.error(`[Retry] Attempt ${attempt} failed.`, error);

      return {
        status: "request_error",
        attempts: attempt,
      };
    }

    if (attempt < numberOfRetries) {
      await wait(waitTime);
    }
  }

  return {
    status: "pending",
    attempts: numberOfRetries,
  };
}

export default retryFetchTranscript;
