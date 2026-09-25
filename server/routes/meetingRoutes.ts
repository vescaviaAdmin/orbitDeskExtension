import type { FastifyPluginAsync } from "fastify";
import { saveMeetingHandler } from "../handlers/meetingOperationHandler.js";

const meetingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/save', saveMeetingHandler )
};

export default meetingRoutes;
