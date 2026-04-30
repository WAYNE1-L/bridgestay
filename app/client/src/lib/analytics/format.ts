const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const usd = (n: unknown): string => {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  return Number.isFinite(num) ? usdFormatter.format(num) : "—";
};

export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;

export const safeUSD = (n: unknown) => {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  return Number.isFinite(num) ? usdFormatter.format(num) : "—";
};

export const safePct = (n: unknown, d = 1) => {
  if (n === null || n === undefined || n === "") return "—";
  const num = Number(n);
  return Number.isFinite(num) ? pct(num, d) : "—";
};

export const usdCompact = (n: unknown) => {
  if (!Number.isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(n));
};
