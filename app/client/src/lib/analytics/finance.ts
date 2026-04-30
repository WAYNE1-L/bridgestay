export const pmt = (r: number, n: number, pv: number) =>
  r === 0 ? pv / n : (r * pv) / (1 - Math.pow(1 + r, -n));
