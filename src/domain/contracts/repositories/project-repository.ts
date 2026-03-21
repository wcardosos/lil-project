import type { Project } from "#domain/entities/project"

export interface ProjectRepository {
  listAll(): Promise<Project[]>
  findBySlug(slug: string): Promise<Project | null>
  save(project: Project): Promise<Project>
}
