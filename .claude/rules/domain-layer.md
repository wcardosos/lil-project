# Domain Layer Rules — lilProject

## Overview

It contains the entities, value objects, errors, and contracts (interfaces) that represent the business rules of lilProject — a minimalist project management system.

This document defines all the rules, patterns, and conventions that must be followed when writing code in this layer.

---

## Core principles

### 1. Zero external dependencies

The Domain is pure TypeScript. No file in this layer may import:

- Frameworks (Fastify, Express, Hono)
- ORMs or database drivers (Drizzle, Prisma, pg)
- Validation libraries (Zod, Joi) — validation in the Domain is done with its own logic
- HTTP libraries (axios, fetch wrappers)
- Any package from `node_modules`

The only allowed external import is from `#shared/*`, which contains generic utilities such as `Either`.

```typescript
// ✅ CORRECT
import { Either, success, failure } from "#shared/either";
import { Money } from "#domain/value-objects/money";

// ❌ FORBIDDEN
import { z } from "zod";
import { eq } from "drizzle-orm";
import fetch from "node-fetch";
```

### 2. Dependency rule

The Domain **never** imports from `#application/*` or `#infra/*`. Other internal Domain modules can be imported freely.

```
Allowed imports:
  #domain/entities/*     → #domain/value-objects/*, #domain/errors/*
  #domain/repositories/* → #domain/entities/*, #domain/value-objects/*
  #domain/value-objects/* → #domain/errors/*
  #domain/*              → #shared/*

Forbidden imports:
  #domain/* → #application/*
  #domain/* → #infra/*
```

### 3. No side effects

No code in the Domain may:

- Make HTTP calls
- Access the database
- Read environment variables
- Write to disk or console (except in tests)
- Dispatch asynchronous events

The Domain is **synchronous and deterministic**. Given the same input, it always produces the same output.

---

## Folder structure

```
src/domain/
├── entities/           # Business entities (have identity)
├── value-objects/      # Value objects (immutable, no identity)
├── errors/             # Typed domain errors
└── contracts/          # Ports for external dependencies
    ├── repositories/   # Persistence interfaces (ports)
    ├── gateways/       # External service interfaces (ports)
    └── providers/      # Utility interfaces (ports) (hash, etc.)
```

---

## Base class: Entity\<Props\>

```typescript
// src/domain/entities/entity.ts

export abstract class Entity<Props> {
  private _id?: string;
  protected props: Props;

  protected constructor(props: Props, id?: string) {
    this.props = props;
    this._id = id;
  }

  get id(): string | undefined {
    return this._id;
  }

  // Compares identity between entities of the same type
  equals(other: Entity<Props>): boolean {
    if (!this._id || !other._id) return false;
    return this._id === other._id;
  }
}
```

Base class rules:

- `id` is optional (`undefined` before persisting, assigned by infra).
- `props` is `protected` — accessible only by the entity itself and subclasses. Never exposed directly. External access via getters.
- `equals()` compares by identity (`id`), not by prop values.
- The base class **contains no business logic**. It is purely structural.

### Conventions

- Every entity inherits from `Entity<Props>`, defining the generic `Props` type as an interface with the entity's properties.
- `Props` uses Value Objects for business concepts (price as `Money`, not `number`).
- External access to properties via **getters** that read from `this.props`. Never public setters — mutation happens via methods with business names.
- Every entity implements two static methods:
  - `create(props)` — new creation, with all validations.
  - `reconstitute(props, id)` — reconstruction from persisted data, without re-validating.
- Mutation methods validate preconditions before modifying `this.props`.

### Template

```typescript
// src/domain/entities/[entity-name].ts

import { Entity } from "#domain/entities/entity";
import { DomainError } from "#domain/errors/domain-error";
// import value objects and other entities as needed

interface [EntityName]Props {
  // properties typed with Value Objects when applicable
  // does NOT include id — id is managed by the Entity base class
}

export class [EntityName] extends Entity<[EntityName]Props> {
  private constructor(props: [EntityName]Props, id?: string) {
    super(props, id);
  }

  // New creation — runs ALL validations
  static create(props: [EntityName]Props): [EntityName] {
    // validations
    // throw DomainError if invalid
    return new [EntityName]({ ...props });
  }

  // Reconstruction from database — does NOT re-validate (data was already validated on creation)
  static reconstitute(props: [EntityName]Props, id: string): [EntityName] {
    return new [EntityName](props, id);
  }

  // Getters read from this.props
  get property(): Type {
    return this.props.property;
  }

  // Business methods with expressive names
  doSomething(param: Type): void {
    // validate precondition
    if (/* invalid condition */) {
      throw new DomainError("Descriptive message");
    }
    // mutate via this.props
    this.props.property = newValue;
  }
}
```

### Reference example: Product

```typescript
interface ProductProps {
  name: string;
  price: Money;
  stock: number;
  barcode: Barcode | null;
  active: boolean;
  tenantId: string;
}

export class Product extends Entity {
  private constructor(props: ProductProps, id?: string) {
    super(props, id);
  }

  static create(props: {
    name: string;
    price: number;
    stock: number;
    barcode?: string;
    tenantId: string;
  }): Product {
    if (!props.name || props.name.trim().length < 2) {
      throw new DomainError("Nome do produto deve ter pelo menos 2 caracteres");
    }
    if (props.price < 0.01) {
      throw new DomainError("Preço mínimo é R$ 0,01");
    }
    if (props.stock < 0) {
      throw new DomainError("Estoque não pode ser negativo");
    }

    return new Product({
      name: props.name.trim(),
      price: Money.of(props.price),
      stock: props.stock,
      barcode: props.barcode ? Barcode.create(props.barcode) : null,
      active: true,
      tenantId: props.tenantId,
    });
  }

  static reconstitute(props: ProductProps, id: string): Product {
    return new Product(props, id);
  }

  get name(): string {
    return this.props.name;
  }

  get price(): Money {
    return this.props.price;
  }

  get stock(): number {
    return this.props.stock;
  }

  get barcode(): Barcode | null {
    return this.props.barcode;
  }

  get isActive(): boolean {
    return this.props.active;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  hasStock(quantity: number): boolean {
    return this.props.stock >= quantity;
  }

  decreaseStock(quantity: number): void {
    if (!this.hasStock(quantity)) {
      throw new InsufficientStockError(this.props.name, this.props.stock);
    }
    this.props.stock -= quantity;
  }

  updatePrice(newPrice: number): void {
    if (newPrice < 0.01) {
      throw new DomainError("Preço mínimo é R$ 0,01");
    }
    this.props.price = Money.of(newPrice);
  }

  deactivate(): void {
    this.props.active = false;
  }
}
```

---

## Value Objects

### Definition

Value Objects are **immutable**, have no identity, and represent business concepts with their own rules. Two Value Objects with the same values are considered equal.

### Conventions

- The constructor is **always private**. Creation via static `create()` method or named factory methods (`fromReais`, `fromCents`).
- After creation, the state **never changes**. Operations return new instances.
- All validation happens at creation. If the Value Object exists, it is valid.
- Must implement `equals(other)` for value-based comparison when relevant.
- Formatting methods for display (`format()`, `toString()`) are welcome.

### Template

```typescript
// src/domain/value-objects/[value-object-name].ts

import { DomainError } from "#domain/errors/domain-error";

export class [ValueObjectName] {
  private constructor(readonly value: InternalType) {}

  static create(input: ExternalType): [ValueObjectName] {
    // validations
    // throw DomainError if invalid
    return new [ValueObjectName](processedValue);
  }

  equals(other: [ValueObjectName]): boolean {
    return this.value === other.value;
  }

  format(): string {
    // representation for display
  }
}
```

---

## Domain errors

### Conventions

- All inherit from `DomainError`, which inherits from `Error`.
- Messages are written in **Brazilian Portuguese** (the system targets Brazilian merchants).
- The class name describes the violation, not the context (`InsufficientStockError`, not `AddItemToSaleError`).
- Errors may carry additional data via public properties.

### Template

```typescript
// src/domain/errors/domain-error.ts
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
```

```typescript
// src/domain/errors/[error-name].ts
import { DomainError } from "./domain-error";

export class [ErrorName] extends DomainError {
  constructor(/* contextual parameters */) {
    super("Descriptive message in Portuguese");
    // assign additional properties if necessary
  }
}
```

### Example

```typescript
export class InsufficientStockError extends DomainError {
  constructor(
    public readonly productName: string,
    public readonly availableStock: number,
  ) {
    super(
      `Estoque insuficiente para "${productName}". Disponível: ${availableStock}`,
    );
  }
}
```

---

## Contracts (Ports)

### Definition

Contracts are **TypeScript interfaces** that define what the Domain needs from the outside world, without knowing how it will be implemented. There are three types:

| Type | Folder | Purpose |
|------|--------|---------|
| **Repositories** | `contracts/repositories/` | Entity persistence (CRUD) |
| **Gateways** | `contracts/gateways/` | External service integrations |
| **Providers** | `contracts/providers/` | Technical utilities (hash, token, etc.) |

### Conventions

- Contracts use only Domain types (entities, value objects) in parameters and returns. Never infra types (database rows, HTTP responses).
- Methods are asynchronous (`Promise<>`), as the implementation will likely be I/O.
- Method names describe the business operation, not the technology (`findByBarcode`, not `queryByBarcodeSQL`).
- One contract per file, named as `[entity]-repository.ts`, `[service]-gateway.ts`, or `[utility]-provider.ts`.

### Template: Repository

```typescript
// src/domain/contracts/repositories/[entity]-repository.ts

import { [Entity] } from "#domain/entities/[entity]";

export interface [Entity]Repository {
  findById(id: string): Promise<[Entity] | null>;
  save(entity: [Entity]): Promise<[Entity]>;
  update(entity: [Entity]): Promise<void>;
  // specific methods as needed by the entity
}
```

### Template: Gateway

```typescript
// src/domain/contracts/gateways/[service]-gateway.ts

// Uses Domain types in parameters and returns
export interface [Service]Gateway {
  method(param: DomainType): Promise<DomainReturnType>;
}
```

### Reference: PaymentGateway

```typescript
import { Money } from "#domain/value-objects/money";

export interface PixPaymentRequest {
  amount: Money;
  description: string;
  externalId: string;
}

export interface PixPaymentResponse {
  transactionId: string;
  qrCode: string;
  qrCodeImage: string;
  expiresAt: Date;
}

export interface PaymentGateway {
  createPixPayment(request: PixPaymentRequest): Promise<PixPaymentResponse>;
  checkPaymentStatus(transactionId: string): Promise<"pending" | "paid" | "expired">;
}
```

---

## General code conventions

### Language

- Class, method, variable, and type names: **English**.
- Error messages (DomainError): **Brazilian Portuguese**.
- Comments: **Brazilian Portuguese** only when explaining a business rule. Avoid obvious comments.

### Style

- Use `readonly` on properties that do not change after construction.
- Prefer `private constructor` + static factory methods.
- Getters for access. Never public setters.
- Mutation methods with business names: `deactivate()`, not `setActive(false)`.
- Do not use `any` or `unknown` — type everything explicitly.
- Do not use `enum`. Use union types: `type SaleStatus = "open" | "paid" | "cancelled"`.
- Do not use `null` and `undefined` interchangeably. Convention: `null` for "absence of value" in properties, `undefined` only for `id` before persisting.

### Domain rules: where each type lives

| If the rule... | Then it lives in... |
|----------------|---------------------|
| Belongs to a single entity and needs no external data | **Entity** method |
| Is about format, validation, or transformation of a value | **Value Object** |
| Needs to coordinate multiple entities or query data | **Use Case** (Application, outside the Domain) |

### Tests

The Domain is the most testable layer of the system because it has no external dependencies. All tests are unit tests and synchronous (except contracts, which are tested via in-memory implementations in the test layer).

Expectations for entity tests:

- Test valid creation (`create` returns the correct instance).
- Test all validations (`create` throws `DomainError` with the correct message).
- Test each mutation method, including preconditions that must fail.
- Test `reconstitute` separately, confirming it does NOT re-validate.

Expectations for Value Object tests:

- Test valid and invalid creation.
- Test immutability (operations return new instances).
- Test `equals` when implemented.
- Test `format` / `toString` when implemented.
