import { db } from "./client"
import { projects } from "./schema"

async function seed() {
  await db
    .insert(projects)
    .values([
      { name: "lilProject", slug: "lil-project" },
      { name: "TinyPDV", slug: "tiny-pdv" },
      { name: "Minha Estante", slug: "minha-estante" },
    ])
    .onConflictDoNothing()

  console.log("Seed concluído.")
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
