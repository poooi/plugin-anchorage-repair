/**
 * Selector for a Blueprint class of any version (`bp5-dark`, `bp6-dark`, ...).
 * Plain `[class^="bp"][class$="${suffix}"]` tests the whole class attribute,
 * so it breaks when the element carries other classes (e.g.
 * `bp6-disable-focus bp6-dark`); the paired `:is()` groups match the prefix
 * and suffix at class-token boundaries instead.
 */
export const bpClass = (suffix: string): string =>
  `:is([class^="bp"], [class*=" bp"]):is([class$="${suffix}"], [class*="${suffix} "])`
