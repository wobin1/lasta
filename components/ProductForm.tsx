"use client";

import { ProductStatus } from "@prisma/client";
import Link from "next/link";
import { useActionState } from "react";
import { createProduct, updateProduct, type FormState } from "@/app/actions/products";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { productStatusLabel } from "@/lib/labels";
import { PRODUCTION_STAGES, productionStageLabel } from "@/lib/stages";

const initial: FormState = {};

export function ProductForm({
  product,
  categories,
  templates,
  canManageCategories,
}: {
  product?: {
    id: string;
    name: string;
    categoryId: string;
    description: string | null;
    priceKobo: number;
    productionDays: number;
    status: ProductStatus;
    imageUrl: string | null;
    productionTemplateId: string | null;
    omittedStages: string[];
  };
  categories: { id: string; name: string }[];
  templates: { id: string; name: string }[];
  canManageCategories: boolean;
}) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const [state, formAction] = useActionState(action, initial);
  const defaultPrice = product ? (product.priceKobo / 100).toFixed(2) : "";

  if (categories.length === 0) {
    return (
      <Alert>
        Add a category first
        {canManageCategories ? (
          <>
            {" "}
            on{" "}
            <Link className="underline underline-offset-2" href="/products/categories">
              Categories
            </Link>
            , then come back to create a product.
          </>
        ) : (
          ". Ask the owner or a manager to create one."
        )}
      </Alert>
    );
  }

  return (
    <form action={formAction} className="grid max-w-xl gap-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Name" htmlFor="name">
        <input
          id="name"
          name="name"
          required
          defaultValue={product?.name}
          className={inputClassName()}
        />
      </Field>
      <Field
        label="Category"
        htmlFor="categoryId"
        hint={
          canManageCategories
            ? "Pick from categories already on the system. Add more on Categories."
            : "Pick from categories already on the system."
        }
      >
        <Select
          id="categoryId"
          name="categoryId"
          required
          defaultValue={product?.categoryId ?? ""}
          placeholder="Select a category"
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
        />
      </Field>
      <Field label="Price (₦)" htmlFor="priceNaira">
        <input
          id="priceNaira"
          name="priceNaira"
          required
          inputMode="decimal"
          defaultValue={defaultPrice}
          className={inputClassName()}
        />
      </Field>
      <Field label="Typical production days" htmlFor="productionDays">
        <input
          id="productionDays"
          name="productionDays"
          type="number"
          min="1"
          defaultValue={product?.productionDays ?? 14}
          className={inputClassName()}
        />
      </Field>
      <Field label="Description" htmlFor="description" hint="Optional">
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
          className={`${inputClassName()} py-2`}
        />
      </Field>
      <Field label="Image URL" htmlFor="imageUrl" hint="Optional. Paste a photo link for now.">
        <input
          id="imageUrl"
          name="imageUrl"
          type="url"
          defaultValue={product?.imageUrl ?? ""}
          className={inputClassName()}
        />
      </Field>
      <Field
        label="Production template"
        htmlFor="productionTemplateId"
        hint="Stages this product will use. Confirming an order creates one task per stage."
      >
        <Select
          id="productionTemplateId"
          name="productionTemplateId"
          defaultValue={product?.productionTemplateId ?? ""}
          options={[
            { value: "", label: "No template yet" },
            ...templates.map((template) => ({ value: template.id, label: template.name })),
          ]}
        />
      </Field>
      {product ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Skip stages on this product</legend>
          <p className="text-sm text-[var(--muted)]">Optional. Unticked stages still run if they are on the template.</p>
          <ul className="space-y-2">
            {PRODUCTION_STAGES.map((stage) => (
              <li key={stage}>
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    name="omitStage"
                    value={stage}
                    defaultChecked={product.omittedStages.includes(stage)}
                    className="h-5 w-5"
                  />
                  <span>Skip {productionStageLabel[stage]}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}
      {product ? (
        <Field label="Status" htmlFor="status">
          <Select
            id="status"
            name="status"
            defaultValue={product.status}
            options={Object.entries(productStatusLabel).map(([value, label]) => ({ value, label }))}
          />
        </Field>
      ) : null}
      <SubmitButton>{product ? "Save product" : "Create product"}</SubmitButton>
    </form>
  );
}
