import type { FastifyPluginAsync } from "fastify";

import { inviteAgentHandler } from "../handlers/agentOperationHandler.js";

const agentRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post('/invite', inviteAgentHandler);
}

export default agentRoutes;
