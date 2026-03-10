# Shared Layer Rules — lilProject

## Overview

The Shared layer is a toolkit of generic types and utilities that any layer of the system can use. It contains no business logic, has no knowledge of the lilProject domain, and does not depend on any other layer. If copied to a completely different project, it would work without modification.

---

## Core principles

### 1. Zero dependencies

Shared does not import from any system layer or external libraries. It is pure TypeScript.

```typescript
// ✅ CORRECT
export type Either<E, T> = Failure<E> | Success<T>;

// ❌ FORBIDDEN
import { DomainError } from "#domain/errors/domain-error";
import { z } from "zod";
import { Product } from "#domain/entities/product";
```

### 2. No business knowledge

Shared does not know what a product, a sale, a payment, or a tenant is. Nothing in this layer references TinyPDV domain concepts. If a type or function mentions anything domain-specific, it belongs in another layer.

```typescript
// ✅ CORRECT — generic, reusable in any project
type PaginatedResult<T> = { items: T[]; total: number };

// ❌ WRONG — has domain knowledge
type PaginatedProducts = { items: Product[]; total: number };
```

### 3. Who can import

All layers can import from Shared:

```
#domain/*       → can import from #shared/*
#application/*  → can import from #shared/*
#infra/*        → can import from #shared/*
#shared/*       → does NOT import from anyone
```

---

## Folder structure

```
src/shared/
├── either.ts         # Result type (Success | Failure)
└── pagination.ts     # Pagination types
```

The folder is intentionally small. If it is growing too large, it is a sign that something belonging to Domain or Application is leaking into here.

---

## Either

### Definition

`Either` is a type that represents the result of an operation that can **succeed or fail** in a predictable way. It is the alternative to `throw` for errors that the caller must handle explicitly.

### Implementation

```typescript
// src/shared/either.ts

type Success<T> = {
  success: true;
  value: T;
};

type Failure<E> = {
  success: false;
  error: E;
};

export type Either<E, T> = Failure<E> | Success<T>;

export function success<T>(value: T): Success<T> {
  return { success: true, value };
}

export function failure<E>(error: E): Failure<E> {
  return { success: false, error };
}
```

### Usage conventions

- Generic order is `Either<ErrorType, SuccessType>` — error on the left, success on the right.
- Always use the `success()` and `failure()` functions to construct. Never build the object manually.
- Check the result with `result.success` (boolean), never with `"value" in result` or type checking.
- After `if (!result.success)`, TypeScript automatically infers `result.error`. After `if (result.success)`, it infers `result.value`. No cast is necessary.

```typescript
// ✅ CORRECT — automatic type narrowing
const result = await useCase.execute(input);

if (!result.success) {
  // TypeScript knows result.error exists here
  console.log(result.error.message);
  return;
}

// TypeScript knows result.value exists here
console.log(result.value);
```

```typescript
// ❌ WRONG — manual construction
return { success: true, value: product };

// ✅ CORRECT — use factory function
return success(product);
```

### Scope of use

| Situation | Use Either? |
|-----------|------------|
| Predictable business error that the caller must handle (resource not found, duplicate) | Yes |
| Unexpected infrastructure error (database down, timeout) | No — raise as exception |
| Internal entity validation (negative price, insufficient stock) | No — `throw DomainError` |

---

## Pagination

### Definition

Generic types for paginating listings. Used by Domain contracts (repositories), Application use cases, and Infra routes.

### Implementation

```typescript
// src/shared/pagination.ts

export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export function paginate<T>(
  items: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  return {
    items,
    total,
    page: params.page,
    perPage: params.perPage,
    totalPages: Math.ceil(total / params.perPage),
  };
}
```

### Usage conventions

- Repositories receive `PaginationParams` and return `PaginatedResult<Entity>`.
- Use cases forward the params and return the paginated result.
- Routes extract `page` and `perPage` from query params (with defaults: page=1, perPage=20).
- The `paginate()` function is a helper for building the return object. Repositories and use cases should use it instead of building the object manually.

```typescript
// Example usage in a repository (Infra)
async listByTenant(
  tenantId: string,
  params: PaginationParams,
): Promise<PaginatedResult<Product>> {
  const [rows, [{ count }]] = await Promise.all([
    this.db
      .select()
      .from(products)
      .where(eq(products.tenantId, tenantId))
      .limit(params.perPage)
      .offset((params.page - 1) * params.perPage),
    this.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.tenantId, tenantId)),
  ]);

  return paginate(
    rows.map(ProductMapper.toDomain),
    Number(count),
    params,
  );
}
```

---

## Conventions for adding new utilities

### Inclusion criteria

A utility belongs in Shared **only** if:

1. It is completely generic (no references to the TinyPDV domain).
2. It is used by at least two different layers.
3. It does not depend on any external library.
4. It would work without modification in any other TypeScript project.

If the utility satisfies only criteria 1 and 3 but is used by a single layer, it should remain a private function inside that layer, not in Shared.

### What does NOT belong in Shared

- Domain-specific types (`SaleStatus`, `PaymentMethod`).
- Helpers that use external libraries (`formatWithZod`, `drizzleHelper`).
- Functions that reference Domain entities or value objects.
- System configurations or constants (`MAX_ITEMS_PER_SALE`, `PIX_TIMEOUT`).

### Code conventions

- File names in **kebab-case**: `either.ts`, `pagination.ts`.
- Type names in **PascalCase**: `PaginatedResult`, `Either`.
- Function names in **camelCase**: `success`, `failure`, `paginate`.
- Every exported function and type must be generic (`<T>`, `<E, T>`).
- Do not use `any` or `unknown`. Type everything with generics.
- Do not use `class` unless encapsulation is necessary. Prefer types, interfaces, and pure functions.
- Each file exports one cohesive concept. Do not create a generic "utils" file with unrelated functions.

### Tests

Shared utilities are tested with simple, synchronous unit tests. They must cover all paths (success/failure for Either, edge cases for pagination such as total=0 or page beyond range).
