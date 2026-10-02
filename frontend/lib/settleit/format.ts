/** Small, pure formatting helpers. */

export function shortAddress(address: string | null | undefined): string {
  if (!address) return "—";
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function caseNumber(id: number): string {
  return `CASE #${String(id).padStart(4, "0")}`;
}

export function shortHash(hash: string | null | undefined): string {
  if (!hash) return "—";
  if (hash.length < 16) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

export function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function pluralize(n: number, one: string, many: string = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
