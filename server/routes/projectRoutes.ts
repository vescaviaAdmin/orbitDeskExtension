import type { FastifyPluginAsync } from "fastify";
import { createProjectHandler } from "../handlers/projectOperationHandler";


const projectRoutes : FastifyPluginAsync = async(fastify) => {
    fastify.post('/create', createProjectHandler );
    
}

export default projectRoutes;