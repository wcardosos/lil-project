import { Entity } from "#domain/entities/entity";
import { DomainError } from "#domain/errors/domain-error";

interface ProjectProps {
  name: string;
  slug: string;
}

export class Project extends Entity<ProjectProps> {
  private constructor(props: ProjectProps, id?: string) {
    super(props, id);
  }

  static create(props: { name: string; slug: string }): Project {
    const trimmedName = props.name.trim();

    if (trimmedName.length < 3) {
      throw new DomainError("O nome deve ter pelo menos 3 caracteres.");
    }
    if (trimmedName.length > 50) {
      throw new DomainError("O nome pode ter no máximo 50 caracteres.");
    }
    if (/^\d+$/.test(trimmedName)) {
      throw new DomainError("O nome não pode ser composto apenas por números.");
    }

    const normalizedSlug = props.slug
      .normalize("NFD")
      .replace(/\p{Mn}/gu, "")
      .toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalizedSlug)) {
      throw new DomainError("A abreviação deve ter exatamente 3 letras.");
    }

    return new Project({ name: trimmedName, slug: normalizedSlug });
  }

  static reconstitute(props: ProjectProps, id: string): Project {
    return new Project(props, id);
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }
}
