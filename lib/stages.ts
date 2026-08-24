import { ProductionStage } from "@prisma/client";

export const PRODUCTION_STAGES: ProductionStage[] = [
  "PATTERN_DRAFTING",
  "CUTTING",
  "STITCHING",
  "LASTING",
  "FILLING",
  "SOLE_ATTACHMENT",
  "FINISHING",
  "QC",
];

export const productionStageLabel: Record<ProductionStage, string> = {
  PATTERN_DRAFTING: "Pattern drafting",
  CUTTING: "Cutting",
  STITCHING: "Stitching",
  LASTING: "Lasting",
  FILLING: "Filling",
  SOLE_ATTACHMENT: "Sole attachment",
  FINISHING: "Finishing",
  QC: "Quality control",
};

/** One unique header-bar color per stage — no repeats. */
export const productionStageBar: Record<ProductionStage, string> = {
  PATTERN_DRAFTING: "bg-[var(--stage-1)]",
  CUTTING: "bg-[var(--stage-2)]",
  STITCHING: "bg-[var(--stage-3)]",
  LASTING: "bg-[var(--stage-4)]",
  FILLING: "bg-[var(--stage-5)]",
  SOLE_ATTACHMENT: "bg-[var(--stage-6)]",
  FINISHING: "bg-[var(--stage-7)]",
  QC: "bg-[var(--stage-8)]",
};
