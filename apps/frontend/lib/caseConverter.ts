/**
 * Recursively converts all object keys from snake_case to camelCase.
 * This normalizes API responses from the backend (which uses snake_case)
 * to match frontend TypeScript type definitions (which use camelCase).
 *
 * @param obj - The object, array, or primitive value to convert
 * @returns The converted value with all keys in camelCase
 *
 * @example
 * ```typescript
 * const input = { user_name: 'John', created_at: '2024-01-01' };
 * const output = toCamelCase(input);
 * // { userName: 'John', createdAt: '2024-01-01' }
 * ```
 */
export function toCamelCase<T>(obj: T): T {
  // Handle arrays by mapping over each element
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase) as T;
  }

  // Handle objects by converting each key
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      // Convert snake_case to camelCase using regex
      // Matches underscore followed by lowercase letter, replaces with uppercase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );

      // Recursively convert nested values
      acc[camelKey as keyof typeof acc] = toCamelCase(
        obj[key as keyof typeof obj]
      );

      return acc;
    }, {} as T);
  }

  // Return primitives unchanged (string, number, boolean, null, undefined)
  return obj;
}
