import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PRODUCT_VERSION,
  getProductVersion,
  isProductVersionId,
  PRODUCT_VERSION_STORAGE_KEY,
  type ProductVersion,
  type ProductVersionId,
} from "./catalog";

function readStoredVersion(): ProductVersionId {
  try {
    const raw = localStorage.getItem(PRODUCT_VERSION_STORAGE_KEY);
    if (raw && isProductVersionId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_PRODUCT_VERSION;
}

interface ProductVersionContextValue {
  versionId: ProductVersionId;
  version: ProductVersion;
  setVersionId: (id: ProductVersionId) => void;
}

const ProductVersionContext = createContext<ProductVersionContextValue | null>(
  null,
);

export function ProductVersionProvider({ children }: { children: ReactNode }) {
  const [versionId, setVersionIdState] =
    useState<ProductVersionId>(readStoredVersion);

  const setVersionId = useCallback((id: ProductVersionId) => {
    setVersionIdState(id);
    try {
      localStorage.setItem(PRODUCT_VERSION_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      versionId,
      version: getProductVersion(versionId),
      setVersionId,
    }),
    [versionId, setVersionId],
  );

  return (
    <ProductVersionContext.Provider value={value}>
      {children}
    </ProductVersionContext.Provider>
  );
}

export function useProductVersion(): ProductVersionContextValue {
  const ctx = useContext(ProductVersionContext);
  if (!ctx) {
    throw new Error(
      "useProductVersion must be used within ProductVersionProvider",
    );
  }
  return ctx;
}
