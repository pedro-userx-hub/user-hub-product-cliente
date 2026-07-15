import { Button } from "./Button";
import styles from "./Pagination.module.css";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const canGoPrev = page > 1;
  const canGoNext = page < pageCount;

  return (
    <nav className={styles.root} aria-label="Paginação">
      <Button
        variant="clear"
        size="medium"
        className={styles.navButton}
        disabled={disabled || !canGoPrev}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </Button>

      <span className={styles.indicator} aria-current="page">
        {page} / {pageCount}
      </span>

      <Button
        variant="clear"
        size="medium"
        className={styles.navButton}
        disabled={disabled || !canGoNext}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima
      </Button>
    </nav>
  );
}
