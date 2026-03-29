import type { CreateProjectDTO } from "#application/dtos/project.dto";
import { ResourceAlreadyExistsError } from "#application/errors/resource-already-exists";
import type { ProjectRepository } from "#domain/contracts/repositories/project-repository";
import { Project } from "#domain/entities/project";
import { type Either, failure, success } from "#shared/either";

type CreateProjectUseCaseError = ResourceAlreadyExistsError;

type CreateProjectUseCaseResult = {
  projectId: string;
  slug: string;
};

interface CreateProjectUseCaseDependencies {
  projectRepository: ProjectRepository;
}

export class CreateProjectUseCase {
  constructor(private deps: CreateProjectUseCaseDependencies) {}

  async execute(
    input: CreateProjectDTO,
  ): Promise<Either<CreateProjectUseCaseError, CreateProjectUseCaseResult>> {
    const existing = await this.deps.projectRepository.findBySlug(
      input.slug.toUpperCase(),
    );

    if (existing) {
      return failure(
        new ResourceAlreadyExistsError(
          "projeto",
          "abreviação",
          input.slug.toUpperCase(),
        ),
      );
    }

    const project = Project.create({ name: input.name, slug: input.slug });
    const saved = await this.deps.projectRepository.save(project);

    return success({ projectId: saved.id!, slug: saved.slug });
  }
}
