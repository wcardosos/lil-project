import type { ProjectRepository } from "#domain/contracts/repositories/project-repository"
import { success } from "#shared/either"
import type { Either } from "#shared/either"
import type { ProjectOutputDTO } from "#application/dtos/project.dto"

type ListProjectsUseCaseResult = {
  projects: ProjectOutputDTO[]
}

interface ListProjectsUseCaseDependencies {
  projectRepository: ProjectRepository
}

export class ListProjectsUseCase {
  constructor(private deps: ListProjectsUseCaseDependencies) {}

  async execute(): Promise<Either<never, ListProjectsUseCaseResult>> {
    const projects = await this.deps.projectRepository.listAll()

    return success({
      projects: projects.map((p) => ({
        id: p.id!,
        name: p.name,
        slug: p.slug,
      })),
    })
  }
}
