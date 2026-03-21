export class ResourceNotFoundError {
  constructor(
    public readonly resource: string,
    public readonly identifier: string,
  ) {}

  get message(): string {
    return `${this.resource} não encontrado(a): ${this.identifier}`
  }
}
