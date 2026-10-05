/** Copy known fields only; never carry arbitrary imported properties into user data. */
export function pickFields(item: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(fields.filter(key => Object.hasOwn(item, key)).map(key => [key, item[key]]))
}
export function boundedList(value: unknown, max = 50000): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > max) throw Error('Invalid list size')
}
