"use server";

import { revalidateTag } from "next/cache";
import { createProjectSchema } from "#application/schemas/project.schema";
import { CreateProjectUseCase } from "#application/use-cases/project/create-project.use-case";
import { DomainError } from "#domain/errors/domain-error";
import { db } from "#infra/database/client";
import { DrizzleProjectRepository } from "#infra/repositories/drizzle-project-repository";

export type CreateProjectActionState =
  | { status: "success"; slug: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: { name?: string; slug?: string };
    };

export async function createProject(
  formData: FormData,
): Promise<CreateProjectActionState> {
  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
  };

  const parsed = createProjectSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: { name?: string; slug?: string } = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as "name" | "slug";
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { status: "error", message: "Dados inválidos.", fieldErrors };
  }

  try {
    const projectRepository = new DrizzleProjectRepository(db);
    const useCase = new CreateProjectUseCase({ projectRepository });

    const result = await useCase.execute(parsed.data);

    if (!result.success) {
      return {
        status: "error",
        message: result.error.message,
        fieldErrors: { slug: "Esta abreviação já está em uso. Escolha outra." },
      };
    }

    revalidateTag("projects", "max");
    return { status: "success", slug: result.value.slug };
  } catch (error) {
    if (error instanceof DomainError) {
      return { status: "error", message: error.message };
    }
    return {
      status: "error",
      message: "Ocorreu um erro ao criar o projeto. Tente novamente.",
    };
  }
}
