"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProject } from "./actions";

const clientSchema = z.object({
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

function generateSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase();
}

export default function NewProjectPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [touched, setTouched] = useState({ name: false, slug: false });
  const [errors, setErrors] = useState<{
    name?: string;
    slug?: string;
    general?: string;
  }>({});

  const validateField = useCallback((field: "name" | "slug", value: string) => {
    const result = clientSchema.shape[field].safeParse(value);
    setErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0].message,
    }));
  }, []);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setName(value);

    if (!isSlugManual) {
      const generated = generateSlug(value);
      setSlug(generated);
      if (touched.slug) {
        const result = clientSchema.shape.slug.safeParse(generated);
        setErrors((prev) => ({
          ...prev,
          slug: result.success ? undefined : result.error.issues[0].message,
        }));
      }
    }

    if (touched.name) {
      const result = clientSchema.shape.name.safeParse(value);
      setErrors((prev) => ({
        ...prev,
        name: result.success ? undefined : result.error.issues[0].message,
      }));
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
      .normalize("NFD")
      .replace(/\p{Mn}/gu, "")
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 3)
      .toUpperCase();

    setSlug(raw);
    setIsSlugManual(true);

    if (touched.slug) {
      const result = clientSchema.shape.slug.safeParse(raw);
      setErrors((prev) => ({
        ...prev,
        slug: result.success ? undefined : result.error.issues[0].message,
      }));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const result = clientSchema.safeParse({ name, slug });

    if (!result.success) {
      const fieldErrors: { name?: string; slug?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as "name" | "slug";
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      setTouched({ name: true, slug: true });
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("slug", slug);

    startTransition(async () => {
      const response = await createProject(formData);

      if (response.status === "success") {
        router.push(`/projects/${response.slug}/board`);
        return;
      }

      if (response.fieldErrors) {
        setErrors({
          name: response.fieldErrors.name,
          slug: response.fieldErrors.slug,
        });
      } else {
        setErrors({ general: response.message });
      }
    });
  }

  return (
    <div className="p-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold" data-cy="new-project-heading">Novo projeto</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Preencha os dados para criar um novo projeto no workspace.
          </p>
        </div>

        {errors.general && (
          <div className="bg-destructive/10 text-destructive mb-4 rounded-md px-4 py-3 text-sm" data-cy="general-error">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Nome
            </label>
            <Input
              id="name"
              name="name"
              data-cy="project-name-input"
              value={name}
              onChange={handleNameChange}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, name: true }));
                validateField("name", name);
              }}
              placeholder="Ex.: Alpha Projeto"
              disabled={isPending}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && touched.name && (
              <p id="name-error" className="text-destructive text-xs" data-cy="name-error">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="slug" className="text-sm font-medium">
              Abreviação
            </label>
            <Input
              id="slug"
              name="slug"
              data-cy="project-slug-input"
              value={slug}
              onChange={handleSlugChange}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, slug: true }));
                validateField("slug", slug);
              }}
              placeholder="ALP"
              maxLength={3}
              disabled={isPending}
              aria-describedby={errors.slug ? "slug-error" : undefined}
            />
            {errors.slug && touched.slug && (
              <p id="slug-error" className="text-destructive text-xs" data-cy="slug-error">
                {errors.slug}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
              className="flex-1"
              data-cy="cancel-project"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1" data-cy="submit-project">
              {isPending ? "Criando..." : "Criar projeto"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
