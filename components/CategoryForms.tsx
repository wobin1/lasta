"use client";

import { useActionState } from "react";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type FormState,
} from "@/app/actions/categories";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, inputClassName } from "@/components/ui/Field";
import { tableClass, tdClass, thClass, trClass } from "@/components/ui/Table";

const initial: FormState = {};

export function CategoryBoard({
  categories,
}: {
  categories: { id: string; name: string; productCount: number }[];
}) {
  return (
    <div className="overflow-hidden rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow)]">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <p className="mb-3 text-sm font-medium text-[var(--text)]">Add a category</p>
        <CategoryCreateForm key={categories.map((c) => c.id).join("-") || "empty"} />
      </div>
      {categories.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-[var(--muted)]">
          None yet. Add loafers, school shoes, or another style the shop sells.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">Product categories</caption>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Used on</th>
                <th className={thClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <CategoryRow
                  key={`${category.id}-${category.name}-${category.productCount}`}
                  category={category}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CategoryCreateForm() {
  const [state, action] = useActionState(createCategory, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="new-category" className="sr-only">
          New category name
        </label>
        <input
          id="new-category"
          name="name"
          required
          placeholder="e.g. Loafers"
          className={`${inputClassName()} sm:max-w-md`}
        />
        <SubmitButton>Add</SubmitButton>
      </div>
    </form>
  );
}

function CategoryRow({
  category,
}: {
  category: { id: string; name: string; productCount: number };
}) {
  const [state, action] = useActionState(updateCategory.bind(null, category.id), initial);
  const used = category.productCount > 0;

  return (
    <tr className={trClass}>
      <td className={tdClass}>
        <form action={action} className="flex min-w-[16rem] flex-col gap-2">
          {state.error ? <Alert>{state.error}</Alert> : null}
          <div className="flex items-center gap-2">
            <label htmlFor={`name-${category.id}`} className="sr-only">
              Name for {category.name}
            </label>
            <input
              id={`name-${category.id}`}
              name="name"
              required
              defaultValue={category.name}
              className={inputClassName()}
            />
            <SubmitButton variant="ghost">Save</SubmitButton>
          </div>
        </form>
      </td>
      <td className={`${tdClass} text-[var(--muted)]`}>
        {category.productCount === 0
          ? "Unused"
          : `${category.productCount} ${category.productCount === 1 ? "product" : "products"}`}
      </td>
      <td className={tdClass}>
        <div className="flex justify-end">
          {used ? (
            <p className="max-w-[12rem] text-right text-sm text-[var(--muted)]">
              Move products before deleting
            </p>
          ) : (
            <ConfirmDelete
              action={deleteCategory.bind(null, category.id)}
              title="Delete this category?"
              label="Delete"
              message={`“${category.name}” will be removed. This cannot be undone.`}
            />
          )}
        </div>
      </td>
    </tr>
  );
}
