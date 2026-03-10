# Application Layer Rules — lilProject

## Overview

The Application layer is the system's orchestrator. It contains the use cases that coordinate operation flows, the DTOs that define the shape of input and output data, and the Zod schemas that validate external inputs.

The Application contains no business logic — that lives in the Domain. It also does not know how data is persisted or how external services work — that is the responsibility of Infra. The Application only **coordinates**: receives validated input, uses Domain entities and contracts to execute the operation, and returns a result.

---

## Core principles

### 1. Allowed dependencies

Application only imports from `#domain/*` and `#shared/*`. Never from `#infra/*`.

```typescript
// ✅ CORRECT
import { Product } from "#domain/entities/product";
import { ProductRepository } from "#domain/contracts/repositories/product-repository";
import { DomainError } from "#domain/errors/domain-error";
import { Either, success, failure } from "#shared/either";

// ❌ FORBIDDEN
import { DrizzleProductRepository } from "#infra/repositories/drizzle-product-repository";
import { db } from "#infra/database/client";
import fastify from "fastify";
```

### 2. No direct infrastructure access

No code in Application may:

- Access the database directly
- Make HTTP calls
- Read environment variables
- Instantiate Infra classes
- Import frameworks or drivers

Access to external resources happens exclusively via **Domain contracts** (repository, gateway, and provider interfaces), which are injected as dependencies.

### 3. Orchestration logic, not business logic

Application decides **what to do** and **in what order**, but **never how**:

- ✅ "Fetch the product, verify it can be sold, add to sale, save"
- ❌ "If price is less than 0.01, reject" (Product entity rule)
- ❌ "Convert Money to cents before saving" (mapper responsibility in Infra)

If a rule makes sense when explained to the store owner without mentioning software, it belongs in Domain. If it is about coordinating system pieces to complete an operation, it belongs in Application.

---

## Folder structure

```
src/application/
├── use-cases/
│   ├── auth/
│   │   ├── sign-up.use-case.ts
│   │   ├── sign-in.use-case.ts
│   │   └── refresh-token.use-case.ts
│   ├── product/
│   │   ├── create-product.use-case.ts
│   │   ├── update-product.use-case.ts
│   │   └── list-products.use-case.ts
│   ├── sale/
│   │   ├── create-sale.use-case.ts
│   │   ├── add-item-to-sale.use-case.ts
│   │   ├── remove-item-from-sale.use-case.ts
│   │   └── cancel-sale.use-case.ts
│   ├── payment/
│   │   ├── process-pix-payment.use-case.ts
│   │   └── confirm-payment.use-case.ts
│   └── cashier/
│       ├── open-cashier.use-case.ts
│       └── close-cashier.use-case.ts
├── dtos/
│   ├── auth.dto.ts
│   ├── product.dto.ts
│   ├── sale.dto.ts
│   └── payment.dto.ts
└── schemas/
    ├── auth.schema.ts
    ├── product.schema.ts
    ├── sale.schema.ts
    └── payment.schema.ts
```

Organized by business domain (auth, product, sale, payment, cashier), not by technical type.

---

## Use Cases

### Definition

A use case represents a **single operation** of the system. It receives a typed input (DTO), coordinates Domain entities and contracts, and returns a result via `Either`.

### Conventions

- **One use case per file.** The file name follows the pattern **`[action]-[entity].use-case.ts`** in kebab-case: `create-product.use-case.ts`, `add-item-to-sale.use-case.ts`. The class name follows the pattern **`[Action][Entity]UseCase`**: `CreateProductUseCase`, `AddItemToSaleUseCase`, `ProcessPixPaymentUseCase`.
- **Single responsibility.** Each use case does one thing. If the logic is getting long (more than ~50 lines in `execute`), it is a sign it should be split into smaller use cases or that business logic should migrate to the entity.
- **Dependencies via constructor.** The use case receives its dependencies (repositories, gateways, providers) through constructor injection, typed by Domain interfaces.
- **`execute()` method as the sole entry point.** Receives the input DTO and returns `Promise<Either<UseCaseError, Output>>`.
- **Never instantiates Infra classes.** The use case does not know whether the repository uses Drizzle, Prisma, or an in-memory array.
- **Does not perform format validation.** Validation of types, formats, and required fields is the responsibility of the Zod schema in the route (Infra). The use case assumes input has already arrived in the correct format.
- **Performs composite business rule validation.** Rules that depend on external data (uniqueness, existence, cross-permission checks) are verified in the use case.

### Use Case Errors

Use cases utilize specific errors to represent orchestration failures — situations that depend on coordination between multiple parts and do not belong to a single entity.

```typescript
// Use case errors are simple classes, they do not inherit from DomainError
// because they are not Domain business rules — they are orchestration failures

export class ResourceNotFoundError {
  constructor(
    public readonly resource: string,
    public readonly identifier: string,
  ) {}

  get message(): string {
    return `${this.resource} não encontrado(a): ${this.identifier}`;
  }
}

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

export class NotAllowedError {
  get message(): string {
    return "Operação não permitida";
  }
}
```

These errors live in `src/application/errors/` and are reused by all use cases. They are simple classes (without inheriting from `Error`) because they will be encapsulated in `Either` as a value, not thrown as an exception.

```
src/application/
├── errors/
│   ├── resource-not-found.ts
│   ├── resource-already-exists.ts
│   └── not-allowed.ts
├── use-cases/
│   ├── auth/
│   ├── product/
│   ...
│   │   ├── resource-not-found.ts
│   │   ├── resource-already-exists.ts
│   │   └── not-allowed.ts
│   ├── auth/
│   ├── product/
│   ...
```

### Either in the return

Every use case returns `Either<ErrorType, SuccessType>`:

- **Left (failure):** predictable errors — resource not found, duplicate, permission denied, business rule violation.
- **Right (success):** operation result.

Unexpected errors (database down, timeout) are **not** handled with Either. They bubble up as exceptions and are caught by the global error handler in Fastify's Infra.

### Template

```typescript
// src/application/use-cases/[context]/[action]-[entity].use-case.ts

import { Either, success, failure } from "#shared/either";
import { [Entity] } from "#domain/entities/[entity]";
import { [Entity]Repository } from "#domain/contracts/repositories/[entity]-repository";
import { ResourceNotFoundError } from "#application/errors/resource-not-found";
import type { [Action][Entity]DTO } from "#application/dtos/[context].dto";

// Error type: union of all possible errors for this use case
type [Action][Entity]UseCaseError =
  | ResourceNotFoundError
  | ResourceAlreadyExistsError;

// Success type: object with return data
type [Action][Entity]UseCaseResult = {
  // return properties
};

// Dependencies interface
interface [Action][Entity]UseCaseDependencies {
  entityRepository: [Entity]Repository;
  // other repositories, gateways, providers
}

export class [Action][Entity]UseCase {
  constructor(private deps: [Action][Entity]UseCaseDependencies) {}

  async execute(
    input: [Action][Entity]DTO,
  ): Promise<Either<[Action][Entity]UseCaseError, [Action][Entity]UseCaseResult>> {
    // 1. Fetch necessary data via repositories/gateways
    // 2. Apply business rules via entity methods
    // 3. Persist changes via repositories
    // 4. Return success() or failure()
  }
}
```

### Reference example: CreateProductUseCase

```typescript
import { Either, success, failure } from "#shared/either";
import { Product } from "#domain/entities/product";
import { ProductRepository } from "#domain/contracts/repositories/product-repository";
import { ResourceAlreadyExistsError } from "#application/errors/resource-already-exists";
import type { CreateProductDTO } from "#application/dtos/product.dto";

type CreateProductUseCaseError = ResourceAlreadyExistsError;

type CreateProductUseCaseResult = {
  productId: string;
};

interface CreateProductUseCaseDependencies {
  productRepository: ProductRepository;
}

export class CreateProductUseCase {
  constructor(private deps: CreateProductUseCaseDependencies) {}

  async execute(
    input: CreateProductDTO,
  ): Promise<Either<CreateProductUseCaseError, CreateProductUseCaseResult>> {
    // Composite rule: barcode uniqueness (requires the repository)
    if (input.barcode) {
      const existing = await this.deps.productRepository.findByBarcode(
        input.barcode,
      );

      if (existing) {
        return failure(
          new ResourceAlreadyExistsError("produto", "código de barras", input.barcode),
        );
      }
    }

    // Entity creation (internal validations happen here)
    // If it fails (e.g.: negative price), DomainError bubbles up as exception
    const product = Product.create({
      name: input.name,
      price: input.price,
      stock: input.initialStock,
      barcode: input.barcode,
      tenantId: input.tenantId,
    });

    const saved = await this.deps.productRepository.save(product);

    return success({ productId: saved.id! });
  }
}
```

### DomainError vs Either: when to use each

Inside `execute()`, there are two error paths:

| Situation | Mechanism | Example |
|-----------|-----------|---------|
| Predictable orchestration failure (resource not found, duplicate) | `return failure(...)` via Either | Product does not exist in database |
| Entity business rule violation | `throw DomainError` (bubbles up as exception) | Negative price, insufficient stock |
| Unexpected infrastructure failure | Unhandled exception (caught by global error handler) | Database down, network timeout |

The use case does **not** try/catch entity calls. If `Product.create()` throws `DomainError` for invalid price, that error bubbles up to the Fastify error handler, which returns 422. Either is reserved for errors the use case **anticipates and explicitly decides to handle**.

---

## DTOs (Data Transfer Objects)

### Definition

DTOs define the **shape of data** entering and leaving use cases. They are pure types (interfaces or type aliases) — not classes, no methods, no validation.

### Conventions

- DTOs use **primitive types** (`string`, `number`, `boolean`), not Domain Value Objects. The conversion from primitive to Value Object happens inside the use case or entity.
- Input DTOs reflect what the client sends. Output DTOs reflect what the client receives.
- Grouped by business context in a single file: `product.dto.ts` contains `CreateProductDTO`, `UpdateProductDTO`, `ListProductsDTO`.
- `tenantId` is part of the input DTO when the operation depends on multi-tenant isolation. It is injected by the route (extracted from the JWT), never sent by the client in the body.

### Template

```typescript
// src/application/dtos/[context].dto.ts

export interface [Action][Entity]DTO {
  // primitive fields the use case needs to execute
  // tenantId when the operation is multi-tenant
}
```

### Reference example

```typescript
// src/application/dtos/product.dto.ts

export interface CreateProductDTO {
  name: string;
  price: number;         // in reais (e.g.: 5.50) — entity converts to Money
  initialStock: number;
  barcode?: string;      // optional, not every product has a barcode
  tenantId: string;      // injected by the route via JWT
}

export interface UpdateProductDTO {
  productId: string;
  name?: string;
  price?: number;
  stock?: number;
  tenantId: string;
}

export interface ListProductsDTO {
  tenantId: string;
  search?: string;
  page?: number;
  perPage?: number;
}
```

---

## Schemas (Zod)

### Definition

Zod schemas validate and transform **external input** (body, query params) before reaching the use case. They are the system's entry barrier — ensuring malformed data never reaches the Application.

### Conventions

- Schemas live in Application because they define the **input contract** of use cases, regardless of which HTTP framework is in Infra.
- Each schema corresponds to a DTO. The schema validates and the typed output is compatible with the DTO.
- Schemas validate **format and presence**, not business rules. Examples:
  - ✅ Schema: `price` is a positive number (format)
  - ✅ Schema: `name` has at least 1 character (presence)
  - ❌ Schema: minimum price is R$ 0.01 (business rule, belongs to the entity)
  - ❌ Schema: barcode is unique (composite rule, belongs to the use case)
- Zod is the **only** external library allowed in Application. No other library may be imported.
- `tenantId` is **not** part of the schema — it comes from the JWT in the route, not from the client's body.
- Schemas may apply `.trim()` and `.toLowerCase()` for basic normalization.

### Template

```typescript
// src/application/schemas/[context].schema.ts

import { z } from "zod";

export const [action][Entity]Schema = z.object({
  // fields with format and presence validations
  // does NOT include tenantId (comes from JWT)
});

// Type inferred from schema, useful for the route
export type [Action][Entity]Input = z.infer<typeof [action][Entity]Schema>;
```

### Reference example

```typescript
// src/application/schemas/product.schema.ts

import { z } from "zod";

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório"),
  price: z
    .number()
    .positive("Preço deve ser um número positivo"),
  initialStock: z
    .number()
    .int("Estoque deve ser um número inteiro")
    .min(0, "Estoque não pode ser negativo"),
  barcode: z
    .string()
    .length(13, "Código de barras deve ter 13 dígitos")
    .regex(/^\d+$/, "Código de barras deve conter apenas números")
    .optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
```

### Relationship between Schema, DTO, and Use Case

The complete flow of external input to the use case:

```
1. Client sends POST /products with JSON body

2. Route (Infra) validates with schema:
   const input = createProductSchema.parse(req.body);
   // If it fails → ZodError → error handler returns 400

3. Route builds the DTO adding JWT data:
   const dto: CreateProductDTO = {
     ...input,              // fields validated by schema
     tenantId: req.user.tenantId,  // extracted from JWT
   };

4. Route calls the use case:
   const result = await useCases.createProduct.execute(dto);

5. Use case creates the entity (business validations):
   const product = Product.create({ ...dto });
   // If it fails → DomainError → error handler returns 422
```

---

## General code conventions

### Language

- Class, method, variable, and type names: **English**.
- Messages in Zod schemas: **Brazilian Portuguese** (they will be displayed to the user).
- Comments: **Brazilian Portuguese** when explaining an orchestration decision. Avoid obvious comments.

### Style

- Do not use `any` or `unknown`. Type everything explicitly.
- Do not use `enum`. Use union types.
- Use cases are **classes**, not functions, to allow dependency injection via constructor.
- DTOs are **type aliases** or **interfaces**, never classes.
- Schemas are exported **constants** (`export const`), not classes.
- Private helper methods inside use cases are allowed if they improve readability, but they should be few. If there are many, it is a sign logic should migrate to entities or a new use case.
- `Promise.all` when operations are independent (e.g.: fetch sale and product at the same time). Sequential when there is a dependency (e.g.: create entity, then save).

### Tests

Use cases are tested with **in-memory repositories** and **gateway/provider fakes**, never with mocks (`vi.fn`). This tests behavior, not implementation.

Structure of a use case test:

```typescript
describe("[Action][Entity]UseCase", () => {
  let sut: [Action][Entity]UseCase;
  let entityRepository: InMemory[Entity]Repository;
  // other fake repositories/gateways

  beforeEach(() => {
    entityRepository = new InMemory[Entity]Repository();
    sut = new [Action][Entity]UseCase({ entityRepository });
  });

  it("should [expected behavior in the success scenario]", async () => {
    // Arrange: prepare initial state (insert data into in-memory)
    // Act: execute the use case
    const result = await sut.execute(input);
    // Assert: verify Either (success) and final state
    expect(result.success).toBe(true);
  });

  it("should return failure when [predictable error scenario]", async () => {
    // Arrange + Act
    const result = await sut.execute(input);
    // Assert: verify Either (failure)
    expect(result.success).toBe(false);
  });

  it("should throw DomainError when [business rule violation]", async () => {
    // Arrange + Act + Assert: verify exception
    await expect(sut.execute(input)).rejects.toThrow(DomainError);
  });
});
```

Test coverage expectations:

- **Success scenario** (happy path): the use case completes the operation and returns `success`.
- **All `failure` paths**: resource not found, duplicate, permission denied.
- **DomainError propagation**: when the entity rejects invalid data, the error surfaces correctly.
- **Correct side effects**: after the use case executes, the in-memory repositories contain the expected data (e.g.: stock was reduced, sale was updated).
