import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "O nome deve ter pelo menos 3 caracteres.")
    .max(50, "O nome pode ter no máximo 50 caracteres.")
    .refine(
      (v) => !/^\d+$/.test(v.trim()),
      "O nome não pode ser composto apenas por números.",
    ),
  slug: z
    .string()
    .length(3, "A abreviação deve ter exatamente 3 letras.")
    .regex(/^[A-Za-z]{3}$/, "A abreviação deve conter apenas letras."),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
