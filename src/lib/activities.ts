import type { Unit } from "@/lib/stock";

export type InventoryActivity =
  | {
      id: string;
      kind: "product";
      title: string;
      productName: string;
      productCode: string;
      unit: Unit;
      createdAt: string;
      actorEmail: string;
    }
  | {
      id: string;
      kind: "entrada" | "saida";
      title: string;
      productName: string;
      productCode: string;
      unit: Unit;
      quantity: number;
      note: string | null;
      createdAt: string;
      actorEmail: string;
    };

export type ProductActivityRecord = {
  id: string;
  code: string;
  name: string;
  unit: string;
  created_at: string;
  created_by_email: string;
};

export type MovementActivityRecord = {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  created_at: string;
  created_by_email: string;
  products: { code: string; name: string; unit: string } | null;
};

function toUnit(unit: string): Unit {
  if (unit === "UN" || unit === "GR" || unit === "ML") return unit;
  throw new Error(`Unidade de produto inválida no histórico: ${unit}`);
}

export function buildInventoryActivities(
  products: ProductActivityRecord[],
  movements: MovementActivityRecord[],
): InventoryActivity[] {
  const productActivities: InventoryActivity[] = products.map((product) => ({
    id: `product-${product.id}`,
    kind: "product",
    title: "Produto cadastrado",
    productName: product.name,
    productCode: product.code,
    unit: toUnit(product.unit),
    createdAt: product.created_at,
    actorEmail: product.created_by_email,
  }));

  const movementActivities: InventoryActivity[] = movements.map((movement) => {
    if (movement.type !== "entrada" && movement.type !== "saida") {
      throw new Error(`Tipo de movimentação inválido no histórico: ${movement.type}`);
    }

    return {
      id: `movement-${movement.id}`,
      kind: movement.type,
      title: movement.type === "entrada" ? "Entrada registrada" : "Saída registrada",
      productName: movement.products?.name ?? "Produto removido",
      productCode: movement.products?.code ?? "",
      unit: toUnit(movement.products?.unit ?? "UN"),
      quantity: Number(movement.quantity),
      note: movement.note,
      createdAt: movement.created_at,
      actorEmail: movement.created_by_email,
    };
  });

  return [...productActivities, ...movementActivities]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 3);
}
