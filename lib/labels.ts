import {
  CustomerSource,
  CustomerType,
  InventoryCategory,
  InventoryTxnType,
  InventoryUnit,
  OrderStatus,
  PaymentMethod,
  DeliveryStatus,
  ProductStatus,
  ProductionTaskStatus,
  PurchaseRequestStatus,
  WasteReason,
} from "@prisma/client";

export const orderStatusLabel: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  AWAITING_MATERIALS: "Awaiting materials",
  READY_FOR_PRODUCTION: "Ready for production",
  IN_PRODUCTION: "In production",
  QUALITY_CONTROL: "Quality control",
  FINISHING: "Finishing",
  READY_FOR_DELIVERY: "Ready for delivery",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  ON_HOLD: "On hold",
  RETURNED: "Returned",
  REWORK_REQUIRED: "Rework required",
};

export const orderStatusTone: Record<OrderStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  DRAFT: "neutral",
  CONFIRMED: "info",
  AWAITING_MATERIALS: "warning",
  READY_FOR_PRODUCTION: "info",
  IN_PRODUCTION: "info",
  QUALITY_CONTROL: "info",
  FINISHING: "info",
  READY_FOR_DELIVERY: "success",
  DISPATCHED: "info",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  ON_HOLD: "warning",
  RETURNED: "warning",
  REWORK_REQUIRED: "warning",
};

export const deskStatuses: OrderStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "ON_HOLD",
  "CANCELLED",
];

export const increment1Statuses = deskStatuses;

export const productionReadyStatuses: OrderStatus[] = [
  "READY_FOR_PRODUCTION",
  "IN_PRODUCTION",
  "QUALITY_CONTROL",
  "FINISHING",
  "READY_FOR_DELIVERY",
  "DISPATCHED",
  "DELIVERED",
  "COMPLETED",
];

export const sourceLabel: Record<CustomerSource, string> = {
  WALK_IN: "Walk-in",
  WEBSITE: "Website",
  REFERRAL: "Referral",
  WHATSAPP: "WhatsApp",
  PHONE: "Phone",
  SOCIAL: "Social media",
  OTHER: "Other",
};

export const customerTypeLabel: Record<CustomerType, string> = {
  INDIVIDUAL: "Individual",
  CORPORATE: "Corporate",
  SCHOOL: "School",
  OTHER: "Other",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: "Cash",
  TRANSFER: "Bank transfer",
  POS: "POS",
};

export const productStatusTone: Record<ProductStatus, "neutral" | "success"> = {
  ACTIVE: "success",
  ARCHIVED: "neutral",
};

export const productStatusLabel: Record<ProductStatus, string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export const inventoryCategoryLabel: Record<InventoryCategory, string> = {
  LEATHER: "Leather",
  SUEDE: "Suede",
  FABRIC: "Fabric",
  LINING: "Lining",
  SOLES: "Soles",
  INSOLES: "Insoles",
  THREAD: "Thread",
  GLUE: "Glue",
  LACES: "Laces",
  BUCKLES: "Buckles",
  ACCESSORIES: "Accessories",
  PACKAGING: "Packaging",
  OTHER: "Other",
};

export const inventoryUnitLabel: Record<InventoryUnit, string> = {
  PAIR: "pairs",
  PIECE: "pieces",
  METRE: "metres",
  ML: "ml",
  OTHER: "units",
};

export const inventoryTxnLabel: Record<InventoryTxnType, string> = {
  PURCHASE: "Purchase",
  ISSUE: "Issue to production",
  RETURN: "Return",
  ADJUSTMENT: "Adjustment",
  DAMAGE: "Damage",
  WASTE: "Waste",
  STOCK_COUNT: "Stock count",
  RESERVE: "Reserve",
  UNRESERVE: "Unreserve",
};

export const purchaseStatusLabel: Record<PurchaseRequestStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export const purchaseStatusTone: Record<PurchaseRequestStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  APPROVED: "info",
  RECEIVED: "success",
  CANCELLED: "danger",
};

export const productionTaskLabel: Record<ProductionTaskStatus, string> = {
  ASSIGNED: "Waiting",
  STARTED: "In progress",
  COMPLETED: "Completed",
  BLOCKED: "Waiting on previous stage",
  AWAITING_QC: "Awaiting QC",
};

export const productionTaskTone: Record<ProductionTaskStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  ASSIGNED: "neutral",
  STARTED: "info",
  COMPLETED: "success",
  BLOCKED: "warning",
  AWAITING_QC: "warning",
};

export const wasteReasonLabel: Record<WasteReason, string> = {
  CUTTING_ERROR: "Cutting error",
  MATERIAL_DEFECT: "Material defect",
  BAD_MEASUREMENT: "Bad measurement",
  DAMAGED: "Damaged",
  PRODUCTION_MISTAKE: "Production mistake",
  DESIGN_CHANGE: "Design change",
  OTHER: "Other",
};

export const WASTE_REASONS = Object.keys(wasteReasonLabel) as WasteReason[];

export const deliveryTypeLabel = {
  PICKUP: "Pickup",
  RIDER: "Rider",
} as const;

export const deliveryStatusLabel: Record<DeliveryStatus, string> = {
  READY: "Ready",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  CONFIRMED: "Confirmed",
  FAILED: "Failed",
};

export const deliveryStatusTone: Record<DeliveryStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  READY: "neutral",
  ASSIGNED: "info",
  PICKED_UP: "info",
  IN_TRANSIT: "info",
  DELIVERED: "success",
  CONFIRMED: "success",
  FAILED: "danger",
};

export function formatQty(qty: number, unit: InventoryUnit) {
  const n = Number.isInteger(qty) ? String(qty) : qty.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return `${n} ${inventoryUnitLabel[unit]}`;
}
