import 'dotenv/config';
import Fastify from 'fastify';
import { verifyNeonDb } from './config/neonConnect.js';
import { initializeSchema } from './dbQueries/neonQueries.js';
const fastify = Fastify({
  logger: true
});

await verifyNeonDb();
await initializeSchema();
fastify.get('/health', function(request, reply) {
   return reply.code(200).send({ result: 'Server is healthy' });
});

import agentRoutes from './routes/agentRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';

fastify.register(agentRoutes, {
    prefix: "/agents"
});
fastify.register(projectRoutes, {
    prefix: "/projects"
});
fastify.register(meetingRoutes, {
    prefix: "/meetings"
});

const port = Number(process.env.PORT) || 3000;


const start = async() => {
    try {
    await fastify.listen({ port });
    console.log(`Server is running on port ${port}`);
        
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}


start();
