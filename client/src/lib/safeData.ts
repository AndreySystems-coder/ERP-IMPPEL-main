export function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

