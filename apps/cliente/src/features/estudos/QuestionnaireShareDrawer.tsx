import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCard,
  Button,
  ChevronRightIcon,
  Drawer,
  LinkIcon,
  Skeleton,
  Toggle,
  WalletIcon,
  useToast,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  collectorDisplayStatus,
  collectorKindLabel,
  type ScreenerCollector,
  type ScreenerCollectorKind,
} from "../../lib/screenerShare";
import {
  ScreenerShareValidationError,
  updateScreenerCollector,
} from "../../lib/screenerShareApi";
import { useQuestionnaireShare } from "../../lib/useScreenerShare";
import type { TeamStudy } from "../../lib/teamApi";
import { ScreenerCollectorDetail } from "./ScreenerCollectorDrawer";
import { ScreenerShareStatus } from "./ScreenerShareStatus";
import styles from "./QuestionnaireShareDrawer.module.css";

type ShareStep = "list" | "detail";

const DEFAULT_CASHPOINT_POINTS = 10;

export interface QuestionnaireShareDrawerProps {
  open: boolean;
  study: TeamStudy;
  onClose: () => void;
}

function collectorStatusTooltip(collector: ScreenerCollector): string {
  const status = collectorDisplayStatus(collector);
  if (status === "em_divulgacao") {
    return messages.screenerShareStatusEmDivulgacao;
  }
  if (status === "programado") return messages.screenerShareStatusProgramado;
  if (status === "pausado") return messages.screenerShareHeaderPausado;
  return messages.screenerShareStatusEncerrado;
}

function channelIcon(kind: ScreenerCollectorKind) {
  if (kind === "cashpoint") return <WalletIcon size={20} />;
  return <LinkIcon size={20} />;
}

/**
 * Drawer de divulgação do questionário online (CX) — link padrão e CashPoint.
 */
export function QuestionnaireShareDrawer({
  open,
  study,
  onClose,
}: QuestionnaireShareDrawerProps) {
  const { showToast } = useToast();
  const { share, setShare, loadState, reload } = useQuestionnaireShare(
    study.id,
    open,
  );
  const [step, setStep] = useState<ShareStep>("list");
  const [activeCollectorId, setActiveCollectorId] = useState<string | null>(
    null,
  );
  const [detailSaving, setDetailSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveRequestKey, setSaveRequestKey] = useState(0);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const collectors = useMemo(() => {
    if (!share) return [];
    return share.collectors
      .filter(
        (item) =>
          item.kind === "default_link" || item.kind === "cashpoint",
      )
      .sort((a, b) => {
        if (a.kind === b.kind) return 0;
        if (a.kind === "default_link") return -1;
        return 1;
      });
  }, [share]);

  const activeCollector = useMemo(
    () => collectors.find((item) => item.id === activeCollectorId) ?? null,
    [activeCollectorId, collectors],
  );

  useEffect(() => {
    if (!open) {
      setStep("list");
      setActiveCollectorId(null);
    }
  }, [open]);

  const loading = loadState === "loading";
  const loadError = loadState === "error";

  const requestClose = useCallback(() => {
    if (detailSaving || togglingId != null) return;
    setStep("list");
    setActiveCollectorId(null);
    onClose();
  }, [detailSaving, onClose, togglingId]);

  const requestBack = useCallback(() => {
    if (detailSaving) return;
    setStep("list");
    setActiveCollectorId(null);
  }, [detailSaving]);

  const openDetail = (collector: ScreenerCollector) => {
    setActiveCollectorId(collector.id);
    setStep("detail");
  };

  const toggleCollector = async (
    collector: ScreenerCollector,
    enabled: boolean,
  ) => {
    setTogglingId(collector.id);
    try {
      const patch: {
        enabled: boolean;
        points?: number;
      } = { enabled };
      if (
        collector.kind === "cashpoint" &&
        enabled &&
        (collector.points == null || collector.points <= 0)
      ) {
        patch.points = DEFAULT_CASHPOINT_POINTS;
      }
      const next = await updateScreenerCollector(study.id, collector.id, patch);
      setShare(next);
      showToast({
        type: "success",
        title: enabled
          ? messages.screenerShareCollectorActivated
          : messages.screenerShareCollectorDeactivated,
      });
    } catch (e) {
      showToast({
        type: "error",
        title:
          e instanceof ScreenerShareValidationError
            ? e.message
            : messages.screenerShareLoadCollectorsError,
      });
    } finally {
      setTogglingId(null);
    }
  };

  const drawerTitle =
    step === "detail" && activeCollector ? (
      <>
        <span className={styles.titleName} title={activeCollector.name}>
          {activeCollector.name}
        </span>
        <ScreenerShareStatus
          status={collectorDisplayStatus(activeCollector)}
          tooltip={collectorStatusTooltip(activeCollector)}
        />
        <span className={styles.titleToggle}>
          <Toggle
            label={messages.screenerShareCollectorEnabled}
            checked={activeCollector.enabled}
            disabled={togglingId === activeCollector.id}
            onChange={(checked) =>
              void toggleCollector(activeCollector, checked)
            }
          />
        </span>
      </>
    ) : (
      messages.screenerShareTitle
    );

  const footer =
    step === "detail" ? (
      <>
        <Button variant="clear" size="large" onClick={requestBack}>
          {messages.screenerShareBack}
        </Button>
        <Button
          variant="filled"
          size="large"
          loading={detailSaving}
          disabled={!dirty || loading || loadError}
          onClick={() => setSaveRequestKey((key) => key + 1)}
        >
          {messages.screenerShareSave}
        </Button>
      </>
    ) : (
      <Button variant="clear" size="large" onClick={requestClose}>
        {messages.screenerShareClose}
      </Button>
    );

  return (
    <Drawer
      open={open}
      onClose={requestClose}
      onBack={step === "detail" ? requestBack : undefined}
      backAriaLabel={messages.screenerShareBack}
      title={drawerTitle}
      size="wide"
      dismissible={!detailSaving && togglingId == null}
      footer={footer}
    >
      <div className={styles.body}>
        {loading && (
          <div className={styles.loading} aria-busy="true">
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
        )}

        {loadError && !loading && (
          <div className={styles.loadError}>
            <AlertCard
              variant="warning"
              title={messages.screenerShareLoadCollectorsError}
            />
            <Button variant="clear" size="medium" onClick={() => void reload()}>
              {messages.screenerShareRetry}
            </Button>
          </div>
        )}

        {!loading && !loadError && step === "list" && collectors.length > 0 && (
          <>
            <p className={styles.hint}>
              {messages.estudosQuestionnaireShareOnlyDefaultHint}
            </p>
            <ul className={styles.list}>
              {collectors.map((collector) => (
                <li key={collector.id}>
                  <button
                    type="button"
                    className={styles.card}
                    onClick={() => openDetail(collector)}
                  >
                    <span className={styles.channelIcon} aria-hidden>
                      {channelIcon(collector.kind)}
                    </span>
                    <span className={styles.channelText}>
                      <span className={styles.channelTitleRow}>
                        <span className={styles.channelName}>
                          {collector.name}
                        </span>
                        <ScreenerShareStatus
                          status={collectorDisplayStatus(collector)}
                          tooltip={collectorStatusTooltip(collector)}
                        />
                      </span>
                      <span className={styles.metaRow}>
                        {collectorKindLabel(collector.kind)}
                      </span>
                    </span>
                    <ChevronRightIcon size={20} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {!loading && !loadError && step === "detail" && activeCollector && (
          <ScreenerCollectorDetail
            studyId={study.id}
            collector={activeCollector}
            onUpdated={setShare}
            onDirtyChange={setDirty}
            saving={detailSaving}
            onSavingChange={setDetailSaving}
            saveRequestKey={saveRequestKey}
          />
        )}
      </div>
    </Drawer>
  );
}
