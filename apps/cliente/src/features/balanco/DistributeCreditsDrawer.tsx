import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Input,
  Select,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  allocateWorkspaceCredits,
  AllocateCreditsError,
} from "../../lib/teamApi";
import styles from "./DistributeCreditsDrawer.module.css";

export interface DistributeCreditsTeamOption {
  id: string;
  name: string;
}

export interface DistributeCreditsDrawerProps {
  open: boolean;
  onClose: () => void;
  teams: DistributeCreditsTeamOption[];
  availableB2B: number;
  availableB2C: number;
  onSuccess?: () => void;
}

/**
 * Distribuir créditos do workspace para um time (Balanço).
 */
export function DistributeCreditsDrawer({
  open,
  onClose,
  teams,
  availableB2B,
  availableB2C,
  onSuccess,
}: DistributeCreditsDrawerProps) {
  const { showToast } = useToast();
  const [teamId, setTeamId] = useState("");
  const [wallet, setWallet] = useState<"B2B" | "B2C">("B2B");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    setTeamId(teams[0]?.id ?? "");
    setWallet("B2B");
    setAmount("");
    setError(undefined);
  }, [open, teams]);

  const available = wallet === "B2B" ? availableB2B : availableB2C;

  const teamOptions = useMemo(
    () => teams.map((t) => ({ value: t.id, label: t.name })),
    [teams],
  );

  const walletOptions = [
    { value: "B2B", label: messages.teamCreditsB2B },
    { value: "B2C", label: messages.teamCreditsB2C },
  ];

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(undefined);
    try {
      await allocateWorkspaceCredits({
        teamId,
        wallet,
        amount: Number(amount.replace(",", ".")),
      });
      showToast({
        type: "success",
        title: messages.balancoDistributeSuccess,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      if (e instanceof AllocateCreditsError) {
        setError(e.message);
      } else {
        setError(messages.balancoDistributeError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={messages.balancoDistributeTitle}
      dismissible={!submitting}
      footer={
        <>
          <Button
            variant="clear"
            size="medium"
            disabled={submitting}
            onClick={onClose}
          >
            {messages.inviteCancel}
          </Button>
          <Button
            variant="filled"
            size="medium"
            loading={submitting}
            onClick={() => void handleSubmit()}
          >
            {error
              ? messages.createTeamRetry
              : messages.balancoDistributeConfirm}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <p className={styles.available}>
          {messages.balancoDistributeAvailable(available, wallet)}
        </p>

        <div className={styles.field}>
          <span className={styles.label}>{messages.balancoDistributeTeam}</span>
          <Select
            aria-label={messages.balancoDistributeTeam}
            value={teamId}
            options={teamOptions}
            onChange={setTeamId}
            expandable
            searchable={teamOptions.length >= 8}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>
            {messages.balancoDistributeWallet}
          </span>
          <Select
            aria-label={messages.balancoDistributeWallet}
            value={wallet}
            options={walletOptions}
            onChange={(v) => setWallet(v as "B2B" | "B2C")}
            expandable
            searchable={false}
          />
        </div>

        <div className={styles.field}>
          <Input
            label={messages.balancoDistributeAmount}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </Drawer>
  );
}
