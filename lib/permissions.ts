import { Role } from "@prisma/client";

export type Action =
  | "dashboard.read"
  | "customers.read"
  | "customers.write"
  | "customers.delete"
  | "products.read"
  | "products.write"
  | "products.delete"
  | "categories.write"
  | "orders.read"
  | "orders.write"
  | "orders.delete"
  | "payments.write"
  | "inventory.read"
  | "inventory.write"
  | "purchases.write"
  | "materials.override"
  | "production.board"
  | "production.work"
  | "finishing.queue"
  | "templates.write"
  | "users.write"
  | "qc.read"
  | "qc.write"
  | "waste.write"
  | "delivery.read"
  | "delivery.write"
  | "payments.override"
  | "reports.read";

const MANAGER_ACTIONS: Action[] = [
  "dashboard.read",
  "customers.read",
  "customers.write",
  "products.read",
  "products.write",
  "categories.write",
  "orders.read",
  "orders.write",
  "payments.write",
  "inventory.read",
  "inventory.write",
  "purchases.write",
  "materials.override",
  "production.board",
  "production.work",
  "finishing.queue",
  "templates.write",
  "users.write",
  "qc.read",
  "qc.write",
  "waste.write",
  "delivery.read",
  "delivery.write",
  "payments.override",
  "reports.read",
];

const byRole: Record<Role, Action[]> = {
  OWNER: [
    ...MANAGER_ACTIONS,
    "customers.delete",
    "products.delete",
    "orders.delete",
  ],
  MANAGER: MANAGER_ACTIONS,
  SALES: [
    "dashboard.read",
    "customers.read",
    "customers.write",
    "products.read",
    "orders.read",
    "orders.write",
    "payments.write",
  ],
  PRODUCTION_MANAGER: [
    "dashboard.read",
    "orders.read",
    "products.read",
    "products.write",
    "inventory.read",
    "production.board",
    "production.work",
    "finishing.queue",
    "templates.write",
    "qc.read",
    "waste.write",
  ],
  INVENTORY: [
    "dashboard.read",
    "products.read",
    "orders.read",
    "inventory.read",
    "inventory.write",
    "purchases.write",
    "waste.write",
  ],
  QC: ["orders.read", "qc.read", "qc.write", "waste.write"],
  PRODUCTION_WORKER: ["orders.read", "production.work", "waste.write"],
  FINISHING_WORKER: ["orders.read", "production.work", "finishing.queue", "waste.write"],
  DELIVERY: ["orders.read", "delivery.read", "delivery.write"],
};

export function can(role: Role, action: Action): boolean {
  return byRole[role].includes(action);
}

export function homePath(role: Role) {
  if (role === "PRODUCTION_WORKER") return "/production/me";
  if (role === "FINISHING_WORKER") return "/finishing";
  if (role === "QC") return "/qc";
  if (role === "DELIVERY") return "/delivery";
  return "/dashboard";
}

export function isShopFloorRole(role: Role) {
  return role === "PRODUCTION_WORKER" || role === "FINISHING_WORKER";
}

export function isPhoneHomeRole(role: Role) {
  return isShopFloorRole(role) || role === "DELIVERY" || role === "QC";
}

export const roleLabel: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  SALES: "Sales",
  PRODUCTION_MANAGER: "Production manager",
  INVENTORY: "Inventory",
  QC: "Quality control",
  PRODUCTION_WORKER: "Production worker",
  FINISHING_WORKER: "Finishing",
  DELIVERY: "Delivery",
};
