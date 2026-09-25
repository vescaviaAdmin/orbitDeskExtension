import 'dotenv/config';
import Fastify from 'fastify';
const fastify = Fastify({
  logger: true
});


fastify.get('/health', function(request, reply) {
   return reply.code(200).send({ result: 'Server is healthy' });
});

import transcriptRoutes from './routes/transcripts.js';

fastify.register(transcriptRoutes, {
    prefix: "/transcripts"
});

const port = Number(process.env.PORT) || 3000;


const start = async() => {
    try {
    await fastify.listen({ port });
    console.log(`Server is running on port ${port}`);
        
    } catch (error) {
        console.log(`Error starting server ${error}`);
        process.exit(1);
    }
}


start();
