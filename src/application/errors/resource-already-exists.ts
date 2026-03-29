export class ResourceAlreadyExistsError {
  constructor(
    public readonly resource: string,
    public readonly field: string,
    public readonly value: string,
  ) {}

  get message(): string {
    return `Já existe ${this.resource} com ${this.field}: ${this.value}`;
  }
}
