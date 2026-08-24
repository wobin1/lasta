import { ProductionStage, QcCheckpoint } from "@prisma/client";

export type ChecklistItem = { key: string; label: string };

export const QC_CHECKLISTS: Record<QcCheckpoint, ChecklistItem[]> = {
  CUTTING: [
    { key: "pattern", label: "Pattern" },
    { key: "size", label: "Size" },
    { key: "material", label: "Material" },
    { key: "color", label: "Colour" },
    { key: "qty", label: "Quantity" },
    { key: "defects", label: "No cutting defects" },
  ],
  STITCHING: [
    { key: "stitchQuality", label: "Stitch quality" },
    { key: "alignment", label: "Alignment" },
    { key: "thread", label: "Thread" },
    { key: "looseStitches", label: "No loose stitches" },
    { key: "design", label: "Design" },
  ],
  LASTING: [
    { key: "shape", label: "Shape" },
    { key: "alignment", label: "Alignment" },
    { key: "wrinkles", label: "No wrinkles" },
    { key: "tension", label: "Tension" },
    { key: "size", label: "Size" },
  ],
  FINAL: [
    { key: "appearance", label: "Appearance" },
    { key: "color", label: "Colour" },
    { key: "size", label: "Size" },
    { key: "sole", label: "Sole" },
    { key: "cleanliness", label: "Cleanliness" },
    { key: "finishing", label: "Finishing" },
    { key: "accessories", label: "Accessories" },
    { key: "packaging", label: "Packaging" },
  ],
};

export const qcCheckpointLabel: Record<QcCheckpoint, string> = {
  CUTTING: "Cutting QC",
  STITCHING: "Stitching QC",
  LASTING: "Lasting QC",
  FINAL: "Final QC",
};

const MID_QC_STAGES: ProductionStage[] = ["CUTTING", "STITCHING", "LASTING"];

export function isMidQcStage(stage: ProductionStage) {
  return MID_QC_STAGES.includes(stage);
}

export function jobHasQcStage(stages: { stage: ProductionStage }[]) {
  return stages.some((row) => row.stage === "QC");
}

export function checkpointForTask(stage: ProductionStage, stages: { stage: ProductionStage }[]): QcCheckpoint | null {
  if (stage === "CUTTING") return "CUTTING";
  if (stage === "STITCHING") return "STITCHING";
  if (stage === "LASTING") return "LASTING";
  if (stage === "QC") return "FINAL";
  if (stage === "FINISHING" && !jobHasQcStage(stages)) return "FINAL";
  return null;
}

export function shouldAwaitQc(stage: ProductionStage, stages: { stage: ProductionStage }[]) {
  return checkpointForTask(stage, stages) !== null;
}

export function stagesForCheckpoint(
  checkpoint: QcCheckpoint,
  tasks: { stage: ProductionStage }[],
): ProductionStage[] {
  if (checkpoint === "FINAL") {
    return jobHasQcStage(tasks) ? ["QC"] : ["FINISHING"];
  }
  return [checkpoint as ProductionStage];
}

export function nextTaskStatus(stage: ProductionStage): "ASSIGNED" | "AWAITING_QC" {
  return stage === "QC" ? "AWAITING_QC" : "ASSIGNED";
}
