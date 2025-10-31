/**
 * Mock for uuid module
 * Provides deterministic UUIDs for testing
 */

let counter = 0;

export const v4 = (): string => {
  counter++;
  return `00000000-0000-0000-0000-${counter.toString().padStart(12, '0')}`;
};

export const reset = (): void => {
  counter = 0;
};

export default { v4, reset };
