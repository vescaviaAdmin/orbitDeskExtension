import type { FastifyPluginAsync } from "fastify";

import { inviteBotHandler, getTranscriptHandler, retryGetTranscript } from "../handlers/botOperationHandler.js";
import { saveTranscriptHandler } from "../handlers/transcriptOperationHandler.js";

const transcriptRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post('/save', saveTranscriptHandler);
    fastify.post('/inviteBot', inviteBotHandler);
    fastify.post('/transcript', getTranscriptHandler);
    fastify.post('/retry', retryGetTranscript);
    
}

export default transcriptRoutes;
