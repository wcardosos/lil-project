import { Project } from "#domain/entities/project"
import type { ProjectRow } from "#infra/database/schema"

export class ProjectMapper {
  static toDomain(row: ProjectRow): Project {
    return Project.reconstitute({ name: row.name, slug: row.slug }, row.id)
  }
}
