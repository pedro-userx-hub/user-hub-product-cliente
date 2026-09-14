/**
 * Catálogo de versões do protótipo (DEV) — não é produto.
 * 1.0 = hub atual · 2.0 = evolução IA-centrada (specs a receber).
 */

export type ProductVersionId = "1.0" | "2.0";

export interface ProductVersion {
  id: ProductVersionId;
  label: string;
  tagline: string;
  /** Se false, ainda não há experiência navegável — mostra placeholder. */
  ready: boolean;
}

export const PRODUCT_VERSIONS: ProductVersion[] = [
  {
    id: "1.0",
    label: "1.0",
    tagline: "Hub de pesquisa (atual)",
    ready: true,
  },
  {
    id: "2.0",
    label: "2.0",
    tagline: "IA Centrada — evolução",
    ready: true,
  },
];

export const DEFAULT_PRODUCT_VERSION: ProductVersionId = "1.0";

export const PRODUCT_VERSION_STORAGE_KEY = "userx.cliente.productVersion";

export function isProductVersionId(value: string): value is ProductVersionId {
  return PRODUCT_VERSIONS.some((v) => v.id === value);
}

export function getProductVersion(id: ProductVersionId): ProductVersion {
  return (
    PRODUCT_VERSIONS.find((v) => v.id === id) ??
    PRODUCT_VERSIONS.find((v) => v.id === DEFAULT_PRODUCT_VERSION)!
  );
}
