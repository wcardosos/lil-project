import { defineConfig } from "cypress";
import Database from "better-sqlite3";
import path from "node:path";
import crypto from "node:crypto";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3001",
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on) {
      const dbPath = path.resolve(__dirname, "test.db");

      on("task", {
        "db:reset"() {
          const db = new Database(dbPath);
          db.exec("DELETE FROM projects");
          db.close();
          return null;
        },
        "db:seed"(data: { name: string; slug: string }[]) {
          const db = new Database(dbPath);
          const insert = db.prepare(
            "INSERT OR IGNORE INTO projects (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))",
          );
          for (const row of data) {
            insert.run(crypto.randomUUID(), row.name, row.slug);
          }
          db.close();
          return null;
        },
      });
    },
  },
});
