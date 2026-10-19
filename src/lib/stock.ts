<<<<<<< HEAD
export type Unit = "UN" | "GR" | "ML";
=======
export type Unit = "UN" | "GR";
>>>>>>> 2a4d539 (primeiro git)

/** Aceita decimais locais e agrupamentos como "1.234" ou "1.234,56". */
export function parseDecimal(input: string): number | null {
  let s = input.trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatQuantityInput(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatCurrencyInput(input: string): string {
  const digits = input.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!digits) return "";

  const cents = digits.padStart(3, "0");
  const wholePart = cents.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${wholePart},${cents.slice(-2)}`;
}

export function parseCurrencyInput(input: string): number | null {
  const formatted = formatCurrencyInput(input);
  return formatted ? parseDecimal(formatted) : null;
}

export function calculateUnitPrice(totalPrice: number, quantity: number): number {
  return Math.round((totalPrice / quantity + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function formatUnitPrice(price: number, unit: Unit): string {
<<<<<<< HEAD
  const formatted = price
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    })
    .replace(/\u00a0/g, " ");
  return `${formatted} / ${formatUnitLabel(unit)}`;
=======
  const formatted = price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).replace(/\u00a0/g, " ");
  return `${formatted} / ${unit === "GR" ? "gr" : "un"}`;
>>>>>>> 2a4d539 (primeiro git)
}

export function formatAverageUnitCost(price: number, unit: Unit): string {
  const formatted = price
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 5,
      maximumFractionDigits: 5,
    })
    .replace(/\u00a0/g, " ");
<<<<<<< HEAD
  return `${formatted} / ${formatUnitLabel(unit)}`;
}

export function formatUnitLabel(unit: Unit): string {
  switch (unit) {
    case "UN":
      return "un";
    case "GR":
      return "gr";
    case "ML":
      return "ml";
  }
=======
  return `${formatted} / ${unit === "GR" ? "gr" : "un"}`;
>>>>>>> 2a4d539 (primeiro git)
}

export function calculateWeightedAverageUnitCost(
  entries: ReadonlyArray<{
    type: string;
    quantity: number;
    unit_price: number;
    note: string | null;
  }>,
): number | null {
  const pricedEntries = entries.filter(
    (entry) => entry.type === "entrada" && entry.note !== "Saldo inicial",
  );
  const totalQuantity = pricedEntries.reduce((total, entry) => total + entry.quantity, 0);
  if (totalQuantity === 0) return null;

  const totalCost = pricedEntries.reduce(
    (total, entry) => total + entry.quantity * entry.unit_price,
    0,
  );
  return totalCost / totalQuantity;
}

<<<<<<< HEAD
export function calculateInventoryValue(
  products: ReadonlyArray<{ quantity: number; averageUnitCost: number | null }>,
): { total: number; unpricedItems: number } {
  return products.reduce(
    (result, product) => {
      if (product.quantity === 0) return result;
      if (product.averageUnitCost === null) {
        result.unpricedItems += 1;
        return result;
      }
      result.total += product.quantity * product.averageUnitCost;
      return result;
    },
    { total: 0, unpricedItems: 0 },
  );
}

/** UN, GR e ML representam quantidades inteiras no estoque. */
=======
/** UN e GR representam unidades inteiras: peças ou gramas. */
>>>>>>> 2a4d539 (primeiro git)
export function validateQuantity(input: string, unit: Unit): { value?: number; error?: string } {
  const n = parseDecimal(input);
  if (n === null || n <= 0) return { error: "Informe uma quantidade maior que zero" };
  if (!Number.isInteger(n)) {
    return {
      error:
        unit === "UN"
          ? "Produtos em UN aceitam apenas números inteiros"
<<<<<<< HEAD
          : unit === "GR"
            ? "Produtos em GR aceitam apenas gramas inteiras"
            : "Produtos em ML aceitam apenas mililitros inteiros",
=======
          : "Produtos em GR aceitam apenas gramas inteiras",
>>>>>>> 2a4d539 (primeiro git)
    };
  }
  return { value: n };
}

export function formatQty(n: number, unit: Unit) {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ${unit.toLowerCase()}`;
}

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
