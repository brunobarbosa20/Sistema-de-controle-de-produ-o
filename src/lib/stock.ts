export type Unit = "UN" | "GR";

/** Aceita "2,5", "2.5", "1.234,56". Retorna null se inválido. */
export function parseDecimal(input: string): number | null {
  let s = input.trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** UN e GR representam unidades inteiras: peças ou gramas. */
export function validateQuantity(input: string, unit: Unit): { value?: number; error?: string } {
  const n = parseDecimal(input);
  if (n === null || n <= 0) return { error: "Informe uma quantidade maior que zero" };
  if (!Number.isInteger(n)) {
    return {
      error:
        unit === "UN"
          ? "Produtos em UN aceitam apenas números inteiros"
          : "Produtos em GR aceitam apenas gramas inteiras",
    };
  }
  return { value: n };
}

export function formatQty(n: number, unit: Unit) {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ${unit.toLowerCase()}`;
}

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
