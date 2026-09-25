import { sql } from "../config/neonConnect.js";


async function initializeSchema() {
  console.log('[Neon] Initializing database schema.');
  await sql`CREATE SCHEMA IF NOT EXISTS orbitdesk`;

  await sql`CREATE TABLE IF NOT EXISTS orbitdesk.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(25) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS orbitdesk.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL
      REFERENCES orbitdesk.projects(id)
      ON DELETE CASCADE,
    transcript TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`ALTER TABLE orbitdesk.meetings ADD COLUMN IF NOT EXISTS transcript TEXT`;
  console.log('[Neon] Database schema initialized.');
}

async function createProject(name: string, description: string | null = null) {
  const [project] = await sql`
    INSERT INTO orbitdesk.projects (name, description)
    VALUES (${name}, ${description})
    RETURNING id, name, description, created_at
  `;

  return project;
}

async function fetchAllProjects()
{
  const projects = await sql`SELECT * FROM orbitdesk.projects ORDER BY created_at DESC`;
  return projects;
}

async function saveMeeting(projectId: string, transcript: string) {
  const [meeting] = await sql`
    INSERT INTO orbitdesk.meetings (project_id, transcript)
    VALUES (${projectId}, ${transcript})
    RETURNING id, project_id, transcript, created_at
  `;

  return meeting;
}

export { createProject, saveMeeting, initializeSchema, fetchAllProjects };
