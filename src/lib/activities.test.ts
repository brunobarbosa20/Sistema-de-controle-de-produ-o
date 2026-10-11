import { describe, expect, it } from "vitest";
import { buildInventoryActivities } from "./activities";

describe("atividades recentes do estoque", () => {
  it("combina cadastros e movimentações em ordem cronológica", () => {
    const activities = buildInventoryActivities(
      [
        {
          id: "product-1",
          code: "MP00000001",
          name: "Farinha",
          unit: "GR",
          created_at: "2026-10-10T10:00:00Z",
          created_by_email: "bruno@example.com",
        },
      ],
      [
        {
          id: "movement-1",
          type: "saida",
          quantity: 50,
          note: "Produção",
          created_at: "2026-10-10T11:00:00Z",
          created_by_email: "operador@example.com",
          products: { code: "MP00000001", name: "Farinha", unit: "GR" },
        },
      ],
    );

    expect(activities.map(({ kind }) => kind)).toEqual(["saida", "product"]);
    expect(activities[0]).toMatchObject({
      title: "Saída registrada",
      productName: "Farinha",
      quantity: 50,
      unit: "GR",
      note: "Produção",
    });
  });

  it("limita a lista às três atividades mais recentes", () => {
    const products = Array.from({ length: 10 }, (_, index) => ({
      id: `product-${index}`,
      code: `MP${index}`,
      name: `Produto ${index}`,
      unit: "UN",
      created_at: new Date(Date.UTC(2026, 0, 1, index)).toISOString(),
      created_by_email: "",
    }));

    const activities = buildInventoryActivities(products, []);

    expect(activities).toHaveLength(3);
    expect(activities[0]?.productName).toBe("Produto 9");
    expect(activities.at(-1)?.productName).toBe("Produto 7");
  });
});
