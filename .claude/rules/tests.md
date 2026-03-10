# Tests — TinyPDV

## Overview

TinyPDV uses two types of tests, each with a well-defined scope and responsibility:

| Type | Tool | Scope | Speed |
|------|------|-------|-------|
| **Unit** | Vitest | Domain (entities, value objects) and Application (use cases) | Fast, no I/O |
| **E2E** | Vitest + Fastify inject | Infra (HTTP routes + real database) | Slow, requires PostgreSQL |

The core philosophy is: **test behavior, not implementation**. A well-written test describes what the system does — not how it does it internally. No test should need to be rewritten when internal code changes, as long as the external behavior remains the same.

The Shared layer has no tests of its own — its utilities are exercised indirectly by the Domain and Application tests.

---

## Folder structure

```
tests/
├── unit/
│   ├── helpers/
│   │   └── in-memory-[entity]-repository.ts   # Repository fakes
│   ├── domain/
│   │   ├── entities/
│   │   │   └── [entity].spec.ts
│   │   └── value-objects/
│   │       └── [value-object].spec.ts
│   └── application/
│       └── use-cases/
│           └── [context]/
│               └── [action]-[entity].use-case.spec.ts
└── e2e/
    ├── helpers/
    │   └── build-test-server.ts               # buildTestServer + cleanDatabase
    └── [resource].e2e-spec.ts
```

### Naming conventions

- Unit tests: `[name].spec.ts`
- E2E tests: `[name].e2e-spec.ts`
- The folder structure inside `tests/unit/` mirrors the structure of `src/`.
- Reusable helpers go in `tests/unit/helpers/` (fakes) or `tests/e2e/helpers/` (server and database).
- File names in **kebab-case**: `create-product.use-case.spec.ts`, `money.spec.ts`.

---

## Configuration

### vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.{test,spec}.ts", "tests/**/*.{test,spec,e2e-spec}.ts"],
  },
});
```

`globals: true` means `describe`, `it`, `expect`, `beforeEach`, `beforeAll`, `afterAll` are globally available in unit tests — **no need to import them**. In E2E tests, imports are explicit (see the E2E section).

### tsconfig.json

`tsconfig.json` includes `"types": ["vitest/globals"]` so TypeScript recognizes the globals without imports. The `tests/` folder is included in `"include": ["src", "tests"]`, and path aliases (`#domain/*`, `#application/*`, etc.) work normally in test files.

### npm scripts

| Script | When to use |
|--------|-------------|
| `test:unit` | CI, quick verification (single run) |
| `test:unit:watch` | Local development (watch mode) |
| `test:e2e` | After Docker is running (applies schema before running) |

To run E2E tests, the test database must be available:

```bash
# Start the database
docker compose up -d

# Run E2E tests (applies schema to the test database before running)
npm run test:e2e
```

---

## Unit tests

### Principles

- No I/O dependencies (no database, no HTTP, no filesystem).
- Every external dependency is replaced by **fakes** implemented by hand — never `vi.fn()` or `vi.mock()`.
- Tests are synchronous when possible. Use cases may be asynchronous because they return `Promise`, but no real I/O occurs.
- Each `describe` covers a single concept. Each `it` covers a single behavior.

### Description language

Descriptions in `describe` and `it` must be written in **English**. This ensures consistency with the names of the classes and methods being tested.

```typescript
// ✅ CORRECT
describe("Product", () => {
  describe("create", () => {
    it("should create a product with valid props", () => { ... });
    it("should throw DomainError when name is empty", () => { ... });
  });
});

// ❌ INCORRECT — mixed languages
describe("Product", () => {
  it("deve criar um produto com props válidas", () => { ... });
});
```

Exception: error messages in `expect` that reproduce real system text (DomainError messages, HTTP responses) are written in Brazilian Portuguese, as that is the language of production messages.

```typescript
// ✅ CORRECT — the text reproduces the actual application message
expect(() => Money.of(0)).toThrow("Valor monetário mínimo é R$ 0,01");
```

### Structure of a unit test file

```typescript
// No vitest imports — globals: true

describe("[ClassName]", () => {
  // Shared fixture (valid props for the base scenario)
  const validProps = { ... };

  describe("[methodOrFactoryName]", () => {
    it("should [expected behavior in the happy path]", () => {
      // Arrange
      // Act
      // Assert
    });

    it("should throw DomainError when [violation condition]", () => { ... });
  });
});
```

- The outer `describe` receives the class name: `"Product"`, `"Money"`, `"CreateProductUseCase"`.
- The inner `describe` receives the method or factory name being tested: `"create"`, `"reconstitute"`, `"of"`, `"equals"`.
- `it` describes the behavior and starts with `"should"`.
- Always use `it()`, never `test()`.

---

## Entity tests (Domain)

### What to test

| Scenario | How to test |
|----------|-------------|
| Valid creation with correct props | Verify getters after `create()` |
| Each `create()` validation that fails | `expect(() => Entity.create(...)).toThrow(DomainError)` |
| Exact DomainError message | `.toThrow("expected message")` |
| `reconstitute()` does not re-validate | Pass invalid data to `reconstitute()` and confirm no throw |
| Each mutation method — valid scenario | Verify getter after mutation |
| Each mutation method — violated precondition | `expect(() => entity.method()).toThrow(DomainError)` |
| `id` is `undefined` after `create()` | `expect(entity.id).toBeUndefined()` |
| `id` is assigned after `reconstitute()` | `expect(entity.id).toBe("expected-uuid")` |

### Template

```typescript
import { [Entity] } from "#domain/entities/[entity]";
import { DomainError } from "#domain/errors/domain-error";

describe("[Entity]", () => {
  const validProps = {
    // minimum props for valid creation
  };

  describe("create", () => {
    it("should create a [entity] with valid props", () => {
      const entity = [Entity].create(validProps);

      expect(entity.[prop]).toBe(expectedValue);
      expect(entity.id).toBeUndefined();
    });

    it("should throw DomainError when [field] is [invalid condition]", () => {
      expect(() =>
        [Entity].create({ ...validProps, [field]: invalidValue }),
      ).toThrow(DomainError);

      expect(() =>
        [Entity].create({ ...validProps, [field]: invalidValue }),
      ).toThrow("Expected error message");
    });
  });

  describe("reconstitute", () => {
    it("should reconstitute without re-validating", () => {
      const entity = [Entity].reconstitute(
        { [field]: valueInvalidInCreate },
        "existing-id",
      );

      expect(entity.id).toBe("existing-id");
    });
  });

  describe("[businessMethod]", () => {
    it("should [expected effect] when [condition]", () => {
      const entity = [Entity].create(validProps);
      entity.[method](params);

      expect(entity.[getter]).toBe(newValue);
    });

    it("should throw DomainError when [precondition violated]", () => {
      const entity = [Entity].create(validProps);

      expect(() => entity.[method](params)).toThrow(DomainError);
    });
  });
});
```

### Reference example: product.spec.ts

```typescript
import { Product } from "#domain/entities/product";
import { DomainError } from "#domain/errors/domain-error";

describe("Product", () => {
  const validProps = {
    name: "Coca-Cola 350ml",
    price: 5.5,
    tenantId: "tenant-123",
  };

  describe("create", () => {
    it("should create a product with valid props", () => {
      const product = Product.create(validProps);

      expect(product.name).toBe("Coca-Cola 350ml");
      expect(product.tenantId).toBe("tenant-123");
      expect(product.id).toBeUndefined();
    });

    it("should trim the name", () => {
      const product = Product.create({ ...validProps, name: "  Coca-Cola  " });

      expect(product.name).toBe("Coca-Cola");
    });

    it("should throw DomainError when name is empty", () => {
      expect(() => Product.create({ ...validProps, name: "" })).toThrow(DomainError);
      expect(() => Product.create({ ...validProps, name: "" })).toThrow(
        "Nome do produto deve ter pelo menos 2 caracteres",
      );
    });

    it("should throw DomainError when price is zero", () => {
      expect(() => Product.create({ ...validProps, price: 0 })).toThrow(DomainError);
    });

    it("should throw DomainError when price is negative", () => {
      expect(() => Product.create({ ...validProps, price: -1 })).toThrow(DomainError);
    });
  });

  describe("reconstitute", () => {
    it("should reconstitute without re-validating", () => {
      const product = Product.reconstitute(
        { name: "", price: Money.ofCents(-100), active: true, stock: 0, barcode: null, tenantId: "t" },
        "product-id",
      );

      expect(product.id).toBe("product-id");
    });
  });
});
```

---

## Value Object tests (Domain)

### What to test

| Scenario | How to test |
|----------|-------------|
| Valid creation via factory method | Verify access methods |
| Creation with invalid value | `expect(() => VO.create(...)).toThrow(DomainError)` |
| Immutability | Operations return new instances — do not mutate the original |
| `equals()` with equal values | `expect(a.equals(b)).toBe(true)` |
| `equals()` with different values | `expect(a.equals(b)).toBe(false)` |
| Alternative factory methods (`ofCents`, `fromCents`, etc.) | Verify equivalence with the main factory |
| Conversion/formatting methods | `.toDecimal()`, `.toCents()`, `.format()`, etc. |

### Template

```typescript
import { [ValueObject] } from "#domain/value-objects/[value-object]";
import { DomainError } from "#domain/errors/domain-error";

describe("[ValueObject]", () => {
  describe("[factoryMethod]", () => {
    it("should create [ValueObject] from valid [input]", () => {
      const vo = [ValueObject].[factory](validValue);

      expect(vo.[accessMethod]()).toBe(expectedValue);
    });

    it("should throw DomainError when [invalid condition]", () => {
      expect(() => [ValueObject].[factory](invalidValue)).toThrow(DomainError);
    });
  });

  describe("equals", () => {
    it("should return true for equal values", () => {
      const a = [ValueObject].[factory](value);
      const b = [ValueObject].[factory](value);

      expect(a.equals(b)).toBe(true);
    });

    it("should return false for different values", () => {
      const a = [ValueObject].[factory](valueA);
      const b = [ValueObject].[factory](valueB);

      expect(a.equals(b)).toBe(false);
    });
  });
});
```

### Reference example: money.spec.ts

```typescript
import { Money } from "#domain/value-objects/money";
import { DomainError } from "#domain/errors/domain-error";

describe("Money", () => {
  describe("of", () => {
    it("should create Money from decimal value", () => {
      const money = Money.of(5.5);

      expect(money.toDecimal()).toBe(5.5);
      expect(money.toCents()).toBe(550);
    });

    it("should throw DomainError when value is zero", () => {
      expect(() => Money.of(0)).toThrow(DomainError);
      expect(() => Money.of(0)).toThrow("Valor monetário mínimo é R$ 0,01");
    });

    it("should throw DomainError when value is negative", () => {
      expect(() => Money.of(-1)).toThrow(DomainError);
    });
  });

  describe("ofCents", () => {
    it("should create Money from cents", () => {
      const money = Money.ofCents(550);

      expect(money.toCents()).toBe(550);
      expect(money.toDecimal()).toBe(5.5);
    });
  });

  describe("equals", () => {
    it("should return true for equal values", () => {
      expect(Money.of(10).equals(Money.of(10))).toBe(true);
    });

    it("should return false for different values", () => {
      expect(Money.of(10).equals(Money.of(20))).toBe(false);
    });

    it("should treat Money.of and Money.ofCents as equal for equivalent values", () => {
      expect(Money.of(5.5).equals(Money.ofCents(550))).toBe(true);
    });
  });
});
```

---

## In-Memory Repositories

### Definition

In-memory repositories are **fakes** that simulate persistence in memory. They implement Domain contracts and are used exclusively in unit tests for use cases.

### Location

```
tests/unit/helpers/
└── in-memory-[entity]-repository.ts
```

One file per entity. If two use cases need the same fake, both import from the same file.

### Conventions

- Implements the Domain interface (`implements [Entity]Repository`).
- Public `items` property for inspecting side effects in tests.
- The `save()` method simulates ID assignment by the database using `randomUUID()` from `node:crypto`.
- Uses `Entity.reconstitute()` in `save()` — never `Entity.create()` — because the database returns already-validated data with an ID.
- Search methods iterate `this.items` with `.find()`.
- List methods return arrays — never `null`.
- The `items` array is reset in each test by reinstantiation via `beforeEach`.

### Why `reconstitute()` and not `create()`

The database does not re-validate data when returning after an insert — it simply returns the stored data with a generated ID. `reconstitute()` reflects exactly that behavior. Using `create()` in the fake would break the contract and cause false positives.

### Template

```typescript
// tests/unit/helpers/in-memory-[entity]-repository.ts

import { [Entity] } from "#domain/entities/[entity]";
import type { [Entity]Repository } from "#domain/contracts/repositories/[entity]-repository";
import { randomUUID } from "node:crypto";

export class InMemory[Entity]Repository implements [Entity]Repository {
  items: [Entity][] = [];

  async findById(id: string): Promise<[Entity] | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async save(entity: [Entity]): Promise<[Entity]> {
    const persisted = [Entity].reconstitute(
      {
        // extract all entity props
      },
      randomUUID(),
    );

    this.items.push(persisted);

    return persisted;
  }

  async update(entity: [Entity]): Promise<void> {
    const index = this.items.findIndex((item) => item.id === entity.id);

    if (index >= 0) {
      this.items[index] = entity;
    }
  }
}
```

### Reference example: in-memory-product-repository.ts

```typescript
import { Product } from "#domain/entities/product";
import type { ProductRepository } from "#domain/contracts/repositories/product-repository";
import { randomUUID } from "node:crypto";

export class InMemoryProductRepository implements ProductRepository {
  items: Product[] = [];

  async save(product: Product): Promise<Product> {
    const persisted = Product.reconstitute(
      {
        name: product.name,
        price: product.price,
        tenantId: product.tenantId,
      },
      randomUUID(),
    );

    this.items.push(persisted);

    return persisted;
  }
}
```

---

## Use Case tests (Application)

### What to test

| Scenario | How to test |
|----------|-------------|
| Happy path — complete operation with success | `expect(result.success).toBe(true)` and verify `result.value` |
| Data persisted correctly | Inspect `repository.items` after execute |
| All `failure` paths (Either) | `expect(result.success).toBe(false)` and verify error type |
| `DomainError` propagation from entity | `await expect(sut.execute(...)).rejects.toThrow(DomainError)` |
| Does not persist when there is an orchestration failure | `expect(repository.items).toHaveLength(0)` |

### File structure

```typescript
import { [Action][Entity]UseCase } from "#application/use-cases/[context]/[action]-[entity].use-case";
import { DomainError } from "#domain/errors/domain-error";
import { InMemory[Entity]Repository } from "../../../helpers/in-memory-[entity]-repository";

describe("[Action][Entity]UseCase", () => {
  let sut: [Action][Entity]UseCase;
  let [entity]Repository: InMemory[Entity]Repository;

  beforeEach(() => {
    [entity]Repository = new InMemory[Entity]Repository();
    sut = new [Action][Entity]UseCase({ [entity]Repository });
  });

  it("should [expected result in the happy path]", async () => {
    const result = await sut.execute({
      // valid input
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.value.[prop]).toBeDefined();
    }
  });

  it("should persist [entity] in the repository", async () => {
    await sut.execute({ /* valid input */ });

    expect([entity]Repository.items).toHaveLength(1);
    expect([entity]Repository.items[0].[prop]).toBe(expectedValue);
  });

  it("should return failure when [resource does not exist]", async () => {
    const result = await sut.execute({ /* input that causes failure */ });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBeInstanceOf([ErrorClass]);
    }
  });

  it("should throw DomainError when [business rule violated]", async () => {
    await expect(
      sut.execute({ /* invalid input for the entity */ }),
    ).rejects.toThrow(DomainError);
  });
});
```

The variable holding the use case instance must be named `sut` (System Under Test). Repositories and fakes receive descriptive names: `productRepository`, `saleRepository`.

### Reference example: create-product.use-case.spec.ts

```typescript
import { CreateProductUseCase } from "#application/use-cases/product/create-product.use-case";
import { DomainError } from "#domain/errors/domain-error";
import { InMemoryProductRepository } from "../../../helpers/in-memory-product-repository";

describe("CreateProductUseCase", () => {
  let sut: CreateProductUseCase;
  let productRepository: InMemoryProductRepository;

  beforeEach(() => {
    productRepository = new InMemoryProductRepository();
    sut = new CreateProductUseCase({ productRepository });
  });

  it("should create a product and return the productId", async () => {
    const result = await sut.execute({
      name: "Coca-Cola 350ml",
      price: 5.5,
      tenantId: "tenant-123",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.value.productId).toBeDefined();
      expect(typeof result.value.productId).toBe("string");
    }
  });

  it("should persist the product in the repository", async () => {
    await sut.execute({
      name: "Coca-Cola 350ml",
      price: 5.5,
      tenantId: "tenant-123",
    });

    expect(productRepository.items).toHaveLength(1);
    expect(productRepository.items[0].name).toBe("Coca-Cola 350ml");
    expect(productRepository.items[0].tenantId).toBe("tenant-123");
  });

  it("should throw DomainError when name is empty", async () => {
    await expect(
      sut.execute({ name: "", price: 5.5, tenantId: "tenant-123" }),
    ).rejects.toThrow(DomainError);
  });

  it("should throw DomainError when price is negative", async () => {
    await expect(
      sut.execute({ name: "Coca-Cola 350ml", price: -1, tenantId: "tenant-123" }),
    ).rejects.toThrow(DomainError);
  });
});
```

---

## Assertion patterns

### Either (use case result)

```typescript
// ✅ Verify success
expect(result.success).toBe(true);

// ✅ Access value with narrowing — TypeScript infers result.value after the if
if (result.success) {
  expect(result.value.productId).toBeDefined();
}

// ✅ Verify failure
expect(result.success).toBe(false);

// ✅ Access error with narrowing
if (!result.success) {
  expect(result.error).toBeInstanceOf(ResourceNotFoundError);
}

// ❌ DO NOT use "value" in result — use result.success
if ("value" in result) { ... }

// ❌ DO NOT compare the Either object directly
expect(result).toEqual({ success: true, value: { ... } });
```

### DomainError — exceptions thrown by entities

```typescript
// ✅ Verify type only (when message doesn't matter in context)
expect(() => Product.create({ name: "", price: 5.5, tenantId: "t" })).toThrow(DomainError);

// ✅ Verify both type AND message (when message is part of the contract)
expect(() => Money.of(0)).toThrow(DomainError);
expect(() => Money.of(0)).toThrow("Valor monetário mínimo é R$ 0,01");

// ✅ In async use cases — use await + rejects
await expect(sut.execute({ name: "", ... })).rejects.toThrow(DomainError);

// ❌ DO NOT use try/catch to verify exceptions
try {
  Product.create({ name: "", ... });
  fail("Should have thrown");
} catch (e) {
  expect(e).toBeInstanceOf(DomainError);
}
```

### Side effects — repository state after use case

```typescript
// ✅ Verify number of items
expect(productRepository.items).toHaveLength(1);

// ✅ Verify persisted item data
expect(productRepository.items[0].name).toBe("Coca-Cola 350ml");

// ✅ Verify no persistence (failure scenario)
expect(productRepository.items).toHaveLength(0);
```

---

## E2E Tests

To be defined

---

## Expected coverage per layer

### Shared

Has no tests of its own. Types and functions (`Either`, `paginate`) are covered indirectly by the Application tests.

### Domain — Entities and Value Objects

| What to test | Required |
|--------------|----------|
| All `create()` paths — valid and each invalid | Yes |
| `reconstitute()` — confirm absence of re-validation | Yes |
| All mutation methods — happy path | Yes |
| All mutation methods — failing preconditions | Yes |
| All Value Object factory methods | Yes |
| `equals()` — equal and different values | Yes, when implemented |
| Conversion/formatting methods | Yes, when they exist |

### Application — Use Cases

| What to test | Required |
|--------------|----------|
| Happy path — returns `success` with correct value | Yes |
| Data persisted correctly in repositories | Yes |
| All `failure` paths via Either | Yes |
| `DomainError` propagation from entities | Yes, when applicable |
| Does not persist when there is an orchestration failure | Yes, when applicable |

### Infra — HTTP Routes (E2E)

| What to test | Required |
|--------------|----------|
| Happy path — correct HTTP status and expected body | Yes |
| Zod schema validation — 400 response with `error: "Dados inválidos"` | Yes |
| Resource not found — 404 | Yes, when applicable |
| Duplicate resource — 409 | Yes, when applicable |
| Missing authentication — 401 | Yes, when route requires JWT |

Repositories (`DrizzleProductRepository`) do not need their own tests — they are covered indirectly by E2E tests that exercise the complete flow.

---

## What NOT to test

**Do not use `vi.fn()` or `vi.mock()`.**
Mocks that replace implementations with empty functions test whether the code called a certain method, not whether the behavior is correct. Use fakes (in-memory repositories) that implement the real contract.

```typescript
// ❌ FORBIDDEN — repository mock
const productRepository = {
  save: vi.fn().mockResolvedValue(product),
};

// ✅ CORRECT — fake that implements the contract
const productRepository = new InMemoryProductRepository();
```

**Do not test implementation details.**
If a test needs to know whether `this.deps.productRepository.save` was called exactly once, it is testing implementation. Test the effect: the product is in `productRepository.items`.

**Do not test third-party code.**
Zod, Drizzle, bcrypt, Fastify — these packages already have their own tests. Do not write tests to verify that `.parse()` works.

**Do not duplicate tests between layers.**
If a business rule is already tested in the entity (`product.spec.ts`), the use case test does not need to cover all invalid scenarios again — only those relevant to the orchestration flow.

**Do not share state between tests.**
Each `it` must be independent. Use `beforeEach` to reinstantiate repositories and the SUT. No test should depend on execution order.

**Do not write E2E tests for business logic.**
Rules like "price cannot be negative" belong in entity unit tests. The E2E test only verifies that the HTTP pipeline (schema → use case → database → response) works end-to-end.
