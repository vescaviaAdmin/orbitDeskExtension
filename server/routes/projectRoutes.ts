import type { FastifyPluginAsync } from "fastify";
import { createProjectHandler, fetchAllProjectsHandler } from "../handlers/projectOperationHandler.js";


const projectRoutes : FastifyPluginAsync = async(fastify) => {
    fastify.post('/create', createProjectHandler );
    fastify.get('/fetchAllProject', fetchAllProjectsHandler);
    
}

export default projectRoutes;
