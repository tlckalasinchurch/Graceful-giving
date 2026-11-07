import { describe, expect, it } from "vitest";
import { fundPoolSplit, fundShares } from "./fundShares";

const f = (
  id: number,
  name: string,
  balance: string | number,
  type?: string | null
) => ({
  id,
  name,
  balance,
  type,
});

describe("fundShares", () => {
  it("sorts largest first and computes shares", () => {
    const rows = fundShares([f(1, "ทั่วไป", "300"), f(2, "อาคาร", "700")]);
    expect(rows.map(r => r.name)).toEqual(["อาคาร", "ทั่วไป"]);
    expect(rows.map(r => r.share)).toEqual([70, 30]);
  });

  it("leaves out zero and negative funds", () => {
    const rows = fundShares([
      f(1, "A", "0"),
      f(2, "B", "-50"),
      f(3, "C", "10"),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].share).toBe(100);
  });

  it("merges the tail into one row", () => {
    const rows = fundShares(
      [
        f(1, "A", 50),
        f(2, "B", 20),
        f(3, "C", 15),
        f(4, "D", 10),
        f(5, "E", 5),
      ],
      4
    );
    expect(rows).toHaveLength(4);
    expect(rows[3]).toMatchObject({
      key: "other",
      name: "กองทุนอื่น ๆ (2)",
      balance: 15,
    });
  });

  it("is empty when no fund holds money", () => {
    expect(fundShares([])).toEqual([]);
    expect(fundShares([f(1, "A", 0)])).toEqual([]);
  });
});

describe("fundPoolSplit", () => {
  it("separates general funds from designated/restricted funds", () => {
    const split = fundPoolSplit([
      f(1, "กองทุนทั่วไป", "15000", "general"),
      f(2, "กองทุนอาคาร", "85000", "restricted"),
      f(3, "กองทุนพันธกิจ", "5000", "designated"),
    ]);
    expect(split).toEqual({
      generalBalance: 15000,
      restrictedBalance: 90000,
      hasFunds: true,
    });
  });

  it("defaults missing type to general and reports empty funds", () => {
    expect(fundPoolSplit([])).toEqual({
      generalBalance: 0,
      restrictedBalance: 0,
      hasFunds: false,
    });
    expect(fundPoolSplit([f(1, "หลัก", 2500)])).toEqual({
      generalBalance: 2500,
      restrictedBalance: 0,
      hasFunds: true,
    });
  });
});
