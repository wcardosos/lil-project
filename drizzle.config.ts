import type { Config } from "drizzle-kit"

const url = process.env.TURSO_DATABASE_URL!
const isLocalFile = url?.startsWith("file:")

export default (
  isLocalFile
    ? {
        schema: "./src/infra/database/schema.ts",
        out: "./src/infra/database/migrations",
        dialect: "sqlite",
        dbCredentials: { url },
      }
    : {
        schema: "./src/infra/database/schema.ts",
        out: "./src/infra/database/migrations",
        dialect: "turso",
        dbCredentials: {
          url,
          authToken: process.env.TURSO_AUTH_TOKEN!,
        },
      }
) satisfies Config
