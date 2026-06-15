import { useCallback, useState } from "react";

import { CookbookRepository } from "../models/repositories/CookbookRepository";
import type { Cookbook, CookbookInput } from "../models/types";

const repo = new CookbookRepository();

const slugifyCookbookId = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "cookbook";
};

const buildCookbookId = (title: string): string => {
  return `${slugifyCookbookId(title)}-${Date.now().toString(36)}`;
};

const normalizeCookbookInput = (
  input: Partial<CookbookInput>,
): CookbookInput => {
  return {
    title: input.title?.trim() ?? "",
    description: input.description?.trim() || undefined,
    parentId: input.parentId ?? null,
    recipeIds: input.recipeIds ?? [],
  };
};

export const useCookbookController = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCookbooks = useCallback(
    async (parentId: string | null = null): Promise<Cookbook[]> => {
      setLoading(true);
      setError(null);

      try {
        return await repo.getCookbooks(parentId);
      } catch (caughtError) {
        setError("Could not load cookbooks.");
        throw caughtError;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const getCookbookById = useCallback(
    async (id: string): Promise<Cookbook | null> => {
      setLoading(true);
      setError(null);

      try {
        const cookbook = await repo.getById(id);

        if (!cookbook) {
          setError("Cookbook not found.");
        }

        return cookbook;
      } catch (caughtError) {
        setError("Could not load cookbook.");
        throw caughtError;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const createCookbook = useCallback(
    async (input: Partial<CookbookInput>): Promise<Cookbook> => {
      setLoading(true);
      setError(null);

      try {
        const normalizedInput = normalizeCookbookInput(input);
        const id = buildCookbookId(normalizedInput.title);
        return await repo.create(id, normalizedInput);
      } catch (caughtError) {
        setError("Could not create cookbook.");
        throw caughtError;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateCookbook = useCallback(
    async (id: string, changes: Partial<CookbookInput>): Promise<Cookbook> => {
      setLoading(true);
      setError(null);

      try {
        const existingCookbook = await repo.getById(id);

        if (!existingCookbook) {
          const missingError = new Error("Cookbook not found.");
          setError(missingError.message);
          throw missingError;
        }

        const nextCookbook = normalizeCookbookInput({
          title: changes.title ?? existingCookbook.title,
          description: changes.description ?? existingCookbook.description,
          parentId:
            changes.parentId !== undefined
              ? changes.parentId
              : (existingCookbook.parentId ?? null),
          recipeIds: changes.recipeIds ?? existingCookbook.recipeIds,
        });

        return await repo.update(id, nextCookbook);
      } catch (caughtError) {
        if (
          !(
            caughtError instanceof Error &&
            caughtError.message === "Cookbook not found."
          )
        ) {
          setError("Could not update cookbook.");
        }

        throw caughtError;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const deleteCookbook = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const existingCookbook = await repo.getById(id);

      if (!existingCookbook) {
        const missingError = new Error("Cookbook not found.");
        setError(missingError.message);
        throw missingError;
      }

      await repo.delete(id);
    } catch (caughtError) {
      if (
        !(
          caughtError instanceof Error &&
          caughtError.message === "Cookbook not found."
        )
      ) {
        setError("Could not delete cookbook.");
      }

      throw caughtError;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllCookbooks = useCallback(async (): Promise<Cookbook[]> => {
      setLoading(true);
      setError(null);

      try {
        return await repo.getAll();
      } catch (caughtError) {
        setError("Could not load cookbooks.");
        throw caughtError;
      } finally {
      setLoading(false);
    }
  }, []);

  return {
    getCookbooks,
    getCookbookById,
    getAllCookbooks,
    createCookbook,
    updateCookbook,
    deleteCookbook,
    loading,
    error,
  };
};
