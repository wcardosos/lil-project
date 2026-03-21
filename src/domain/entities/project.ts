import { Entity } from "#domain/entities/entity"
import { DomainError } from "#domain/errors/domain-error"

interface ProjectProps {
  name: string
  slug: string
}

export class Project extends Entity<ProjectProps> {
  private constructor(props: ProjectProps, id?: string) {
    super(props, id)
  }

  static create(props: { name: string; slug: string }): Project {
    if (!props.name || props.name.trim().length < 2) {
      throw new DomainError("Nome do projeto deve ter pelo menos 2 caracteres")
    }
    if (!/^[a-z0-9-]+$/.test(props.slug)) {
      throw new DomainError(
        "Slug do projeto deve conter apenas letras minúsculas, números e hífens",
      )
    }
    return new Project({ name: props.name.trim(), slug: props.slug })
  }

  static reconstitute(props: ProjectProps, id: string): Project {
    return new Project(props, id)
  }

  get name(): string {
    return this.props.name
  }

  get slug(): string {
    return this.props.slug
  }
}
