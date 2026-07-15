import { BalanceCard, type BalanceCardStatus } from "./BalanceCard";
import { BriefcaseIcon, UsersIcon } from "./icons";
import styles from "./WorkspaceBalance.module.css";

export interface WorkspaceWalletBalance {
  total: number;
  allocated: number;
  available: number;
}

export interface WorkspaceBalanceProps {
  status?: BalanceCardStatus;
  b2b: WorkspaceWalletBalance;
  b2c: WorkspaceWalletBalance;
  b2bLabel?: string;
  b2cLabel?: string;
  totalLabel?: string;
  allocatedLabel?: string;
  availableLabel?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * Saldos B2B/B2C do workspace com ícones por carteira.
 */
export function WorkspaceBalance({
  status = "default",
  b2b,
  b2c,
  b2bLabel = "B2B",
  b2cLabel = "B2C",
  totalLabel,
  allocatedLabel,
  availableLabel = "Disponível workspace",
  "aria-label": ariaLabel = "Balanço do workspace",
  className,
}: WorkspaceBalanceProps) {
  return (
    <section
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      aria-label={ariaLabel}
    >
      <BalanceCard
        label={b2cLabel}
        status={status}
        total={b2c.total}
        allocated={b2c.allocated}
        available={b2c.available}
        totalLabel={totalLabel}
        allocatedLabel={allocatedLabel}
        availableLabel={availableLabel}
        tone="success"
        icon={<UsersIcon size={18} />}
      />
      <BalanceCard
        label={b2bLabel}
        status={status}
        total={b2b.total}
        allocated={b2b.allocated}
        available={b2b.available}
        totalLabel={totalLabel}
        allocatedLabel={allocatedLabel}
        availableLabel={availableLabel}
        tone="action"
        icon={<BriefcaseIcon size={18} />}
      />
    </section>
  );
}
