export interface FundLike {
  id: number;
  name: string;
  balance: string | number;
}

export interface FundShare {
  key: string;
  name: string;
  balance: number;
  /** Whole percent of the funds that hold money. */
  share: number;
}

/**
 * The funds that hold money, largest first, as shares of their sum. Funds past
 * `maxRows - 1` merge into one "other" row so the legend stays short. Funds
 * with a zero or negative balance are left out: they have no length to draw.
 */
export function fundShares(
  funds: readonly FundLike[],
  maxRows = 4
): FundShare[] {
  const positive = funds
    .map(f => ({ id: f.id, name: f.name, balance: Number(f.balance) }))
    .filter(f => Number.isFinite(f.balance) && f.balance > 0)
    .sort((a, b) => b.balance - a.balance || a.id - b.id);
  const total = positive.reduce((sum, f) => sum + f.balance, 0);
  if (total <= 0) return [];

  const head =
    positive.length > maxRows ? positive.slice(0, maxRows - 1) : positive;
  const rest = positive.slice(head.length);
  const rows = head.map(f => ({
    key: `fund-${f.id}`,
    name: f.name,
    balance: f.balance,
  }));
  if (rest.length > 0) {
    rows.push({
      key: "other",
      name: `กองทุนอื่น ๆ (${rest.length})`,
      balance: rest.reduce((sum, f) => sum + f.balance, 0),
    });
  }
  return rows.map(r => ({
    ...r,
    share: Math.round((r.balance / total) * 100),
  }));
}
