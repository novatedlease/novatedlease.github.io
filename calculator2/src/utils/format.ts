export function aud(n: number, decimals: number = 2): string {
  return n.toLocaleString("en-AU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function aud0(n: number): string {
  return n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}

export function pct(n: number, decimals: number = 2): string {
  return `${n.toFixed(decimals)}%`;
}

export function pct0(n: number): string {
  return `${Math.round(n)}%`;
}
