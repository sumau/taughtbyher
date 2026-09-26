export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}