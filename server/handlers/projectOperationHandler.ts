import { createProjectController, fetchAllProjectsController } from "../controllers/projectOperationController.js";


async function createProjectHandler(request : any, reply : any) {
  try {
    const { projectName, description } = request.body ?? {};

    if (typeof projectName !== 'string' || !projectName.trim()) {
      return reply.code(400).send({ error: 'projectName is required' });
    }

    const normalizedProjectName = projectName.trim();
    if (normalizedProjectName.length > 25) {
      return reply.code(400).send({ error: 'projectName must be 25 characters or fewer' });
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      return reply.code(400).send({ error: 'description must be a string' });
    }

    const project = await createProjectController(
      normalizedProjectName,
      description ?? null
    );

    return reply.code(201).send({ project });
  } catch (error) {
    console.error('[Projects] Create-project request failed.', error);
    return reply.code(500).send({ error: 'Unable to create project' });
  }
}

async function fetchAllProjectsHandler(_request: any, reply: any) {
  try {
    const projects = await fetchAllProjectsController();
    return reply.code(200).send({ projects });
  } catch (error) {
    console.error('[Projects] Fetch-projects request failed.', error);
    return reply.code(500).send({ error: 'Unable to fetch projects' });
  }
}


export { createProjectHandler, fetchAllProjectsHandler};
