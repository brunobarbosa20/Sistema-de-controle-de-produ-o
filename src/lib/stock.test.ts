import { describe, it, expect } from "vitest";
import {
  calculateUnitPrice,
  calculateWeightedAverageUnitCost,
  formatAverageUnitCost,
  formatCurrencyInput,
  formatQuantityInput,
  formatUnitPrice,
  parseCurrencyInput,
  parseDecimal,
  validateQuantity,
} from "./stock";

describe("quantidades", () => {
  it("aceita números inteiros de gramas", () => {
    expect(parseDecimal("2,5")).toBe(2.5);
    expect(validateQuantity("500", "GR").value).toBe(500);
    expect(validateQuantity("2,5", "GR").error).toBeDefined();
  });
  it("UN não aceita decimais", () => {
    expect(validateQuantity("2,5", "UN").error).toBeDefined();
    expect(validateQuantity("3", "UN").value).toBe(3);
  });
  it("rejeita zero e texto", () => {
    expect(validateQuantity("0", "GR").error).toBeDefined();
    expect(validateQuantity("abc", "GR").error).toBeDefined();
  });
  it("formata agrupamento de milhares sem alterar o valor", () => {
    expect(formatQuantityInput("1234567")).toBe("1.234.567");
    expect(parseDecimal("1.234.567")).toBe(1234567);
    expect(validateQuantity("1.234", "UN").value).toBe(1234);
  });
  it("formata e interpreta valores monetários no padrão brasileiro", () => {
    expect(formatCurrencyInput("1195")).toBe("11,95");
    expect(formatCurrencyInput("123456")).toBe("1.234,56");
    expect(formatCurrencyInput("1.234,56")).toBe("1.234,56");
    expect(formatCurrencyInput("1234")).toBe("12,34");
    expect(formatCurrencyInput("5")).toBe("0,05");
    expect(parseCurrencyInput("1.234,56")).toBe(1234.56);
    expect(parseCurrencyInput("0,05")).toBe(0.05);
  });
  it("permite digitar sequencialmente sem reaproveitar zeros da máscara", () => {
    let value = "";
    for (const digit of "1195") value = formatCurrencyInput(value + digit);
    expect(value).toBe("11,95");
    expect(parseCurrencyInput(value)).toBe(11.95);
  });
  it("calcula o custo por grama a partir do peso e do valor total do pacote", () => {
    const firstPackage = calculateUnitPrice(10, 500);
    const secondPackage = calculateUnitPrice(18, 750);

    expect(firstPackage).toBe(0.02);
    expect(secondPackage).toBe(0.024);
    expect(formatUnitPrice(firstPackage, "GR")).toBe("R$ 0,02 / gr");
    expect(formatUnitPrice(secondPackage, "GR")).toBe("R$ 0,024 / gr");
  });
  it("calcula o custo médio ponderado e ignora o saldo inicial sem custo", () => {
    const average = calculateWeightedAverageUnitCost([
      { type: "entrada", quantity: 500, unit_price: 0.02, note: null },
      { type: "entrada", quantity: 750, unit_price: 0.024, note: null },
      { type: "entrada", quantity: 1000, unit_price: 0, note: "Saldo inicial" },
      { type: "saida", quantity: 100, unit_price: 0, note: null },
    ]);

    expect(average).toBeCloseTo(0.0224);
    expect(average).not.toBeNull();
    expect(formatAverageUnitCost(average!, "GR")).toBe("R$ 0,02240 / gr");
    expect(formatAverageUnitCost(1.237, "UN")).toBe("R$ 1,23700 / un");
    expect(
      calculateWeightedAverageUnitCost([
        { type: "entrada", quantity: 500, unit_price: 0, note: "Saldo inicial" },
      ]),
    ).toBeNull();
  });
});
