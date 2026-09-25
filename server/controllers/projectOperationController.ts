
import { createProject } from "../dbQueries/neonQueries.js";

async function createProjectController(projectName: string, description: string | null) {
  return createProject(projectName, description);
}

export { createProjectController };



