
import { createProject, fetchAllProjects } from "../dbQueries/neonQueries.js";

async function createProjectController(projectName: string, description: string | null) {
  return createProject(projectName, description);
}

async function fetchAllProjectsController()
{
  return fetchAllProjects();
}

export { createProjectController, fetchAllProjectsController };



