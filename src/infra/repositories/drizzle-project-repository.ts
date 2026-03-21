import { asc, eq } from "drizzle-orm"
import type { LibSQLDatabase } from "drizzle-orm/libsql"
import { Project } from "#domain/entities/project"
import type { ProjectRepository } from "#domain/contracts/repositories/project-repository"
import { ProjectMapper } from "#infra/database/mappers/project-mapper"
import { projects } from "#infra/database/schema"

export class DrizzleProjectRepository implements ProjectRepository {
  constructor(private db: LibSQLDatabase) {}

  async listAll(): Promise<Project[]> {
    const rows = await this.db.select().from(projects).orderBy(asc(projects.name))
    return rows.map(ProjectMapper.toDomain)
  }

  async findBySlug(slug: string): Promise<Project | null> {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(eq(projects.slug, slug))
    return row ? ProjectMapper.toDomain(row) : null
  }

  async save(project: Project): Promise<Project> {
    const [row] = await this.db
      .insert(projects)
      .values({ name: project.name, slug: project.slug })
      .returning()
    return ProjectMapper.toDomain(row)
  }
}
