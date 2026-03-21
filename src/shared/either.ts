type Success<T> = { success: true; value: T }
type Failure<E> = { success: false; error: E }

export type Either<E, T> = Failure<E> | Success<T>

export function success<T>(value: T): Success<T> {
  return { success: true, value }
}

export function failure<E>(error: E): Failure<E> {
  return { success: false, error }
}
