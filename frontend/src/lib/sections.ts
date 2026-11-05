/** The pages that live under the "Cuisiner" tab (they share the cooking sub-tabs). */
export const COOK_PATHS = ['/explore', '/fridge', '/planner', '/shopping']

/** True on every cooking page, recipe details included. */
export function isCookPath(pathname: string) {
  return COOK_PATHS.includes(pathname) || pathname.startsWith('/recipes')
}
