import { saveTranscriptController } from "../controllers/transcriptOperationController.js";

async function saveTranscriptHandler(request: any, reply: any) {
    try {
        if (request.body === undefined || request.body === null) {
            return reply.code(400).send({ error: "Transcript data is required" });
        }

        const { fileName, filePath } = await saveTranscriptController(
            request.body?.botId,
            request.body?.transcription
        );

        return reply.code(201).send({
            saved: true,
            fileName,
            filePath
        });
    } catch (error) {
        console.error("Error saving transcript:", error);
        return reply.code(500).send({ error: "Unable to save transcript" });
    }
}



export { saveTranscriptHandler };
