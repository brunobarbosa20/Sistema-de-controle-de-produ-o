import { describe, it, expect } from "vitest";
import { parseDecimal, validateQuantity } from "./stock";

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
});
