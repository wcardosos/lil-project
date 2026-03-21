export abstract class Entity<Props> {
  private _id?: string
  protected props: Props

  protected constructor(props: Props, id?: string) {
    this.props = props
    this._id = id
  }

  get id(): string | undefined {
    return this._id
  }

  equals(other: Entity<Props>): boolean {
    if (!this._id || !other._id) return false
    return this._id === other._id
  }
}
