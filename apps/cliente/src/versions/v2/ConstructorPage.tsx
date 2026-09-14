import {
  ArrowLeftIcon,
  Badge,
  BookOpenIcon,
  Button,
  ListChecksIcon,
  SettingsIcon,
  ShareIcon,
  Tabs,
} from "@userx/ui";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { messages } from "../../lib/messages";
import { useTeamContext } from "../../lib/TeamContext";
import { MaestroPanel } from "./MaestroPanel";
import { useV2Draft } from "./V2DraftContext";
import { useProductVersion } from "../ProductVersionContext";
import { DocumentPane } from "./constructor/DocumentPane";
import { LaunchModal } from "./constructor/LaunchModal";
import { STUDY_TABS, type StudyTabId } from "./constructor/docTypes";
import styles from "./ConstructorPage.module.css";

function studyTitle(objective: string, firstLabel?: string): string {
  const t = objective.trim();
  if (t) return t.length > 56 ? `${t.slice(0, 56)}…` : t;
  if (firstLabel) return `Estudo · ${firstLabel}`;
  return messages.estudosUntitled;
}

function tabIcon(id: StudyTabId) {
  switch (id) {
    case "objective":
      return <BookOpenIcon size={20} />;
    case "recruitment":
      return <ShareIcon size={20} />;
    case "screener":
      return <ListChecksIcon size={20} />;
    case "format":
      return <SettingsIcon size={20} />;
  }
}

/**
 * Construtor Spec 02 — header V1: voltar · tabs centro · lançar direita.
 */
export function ConstructorPage() {
  const navigate = useNavigate();
  const { currentTeam } = useTeamContext();
  const {
    draft,
    setActiveTab,
    updateBlock,
    confirmBlock,
    removeBlock,
    addBlock,
    setOptionMark,
    runLocalizedRecalc,
    launchStudy,
    confirmAllSuggested,
    confirmCriterion,
    removeCriterion,
    resolveAmbiguity,
    updateCriterion,
  } = useV2Draft();
  const { setVersionId } = useProductVersion();
  const [launchOpen, setLaunchOpen] = useState(false);
  const [maestroCollapsed, setMaestroCollapsed] = useState(false);

  const tabBlocks = useMemo(
    () => draft.blocks.filter((b) => b.tab === draft.activeTab),
    [draft.blocks, draft.activeTab],
  );

  const countsByCriterion = useMemo(() => {
    const map = new Map<
      string,
      { isolated: number | null; countable: boolean }
    >();
    for (const row of draft.eligibility.byCriterion ?? []) {
      map.set(row.criterionId, {
        isolated: row.isolated,
        countable: row.countable,
      });
    }
    return map;
  }, [draft.eligibility.byCriterion]);

  const pendingTabs = useMemo(() => {
    const set = new Set<StudyTabId>();
    for (const b of draft.blocks) {
      if (b.status === "suggested" || b.incomplete) set.add(b.tab);
    }
    return set;
  }, [draft.blocks]);

  const tabItems = useMemo(
    () =>
      STUDY_TABS.map((t) => ({
        id: t.id,
        label: t.label,
        icon: tabIcon(t.id),
        trailing: pendingTabs.has(t.id) ? (
          <span className={styles.tabDot} aria-label="pendência" />
        ) : draft.pulsingTabs.includes(t.id) ? (
          <span className={styles.tabPulse} aria-hidden />
        ) : undefined,
      })),
    [pendingTabs, draft.pulsingTabs],
  );

  const activeTabLabel =
    STUDY_TABS.find((t) => t.id === draft.activeTab)?.label ?? "";

  if (!draft.parsedAt) {
    return <Navigate to="/v2" replace />;
  }

  const switchToV1 = () => {
    const ok = window.confirm(messages.v2VersionSwitchWarn);
    if (!ok) return;
    setVersionId("1.0");
  };

  const onBlockChange = (id: string, value: string) => {
    const before = draft.blocks.find((b) => b.id === id);
    updateBlock(id, value);
    const affectsPool =
      before?.kind === "modality" ||
      before?.kind === "session_format" ||
      before?.kind === "quantity" ||
      before?.kind === "source" ||
      before?.kind === "location" ||
      before?.title.includes("Local");
    if (affectsPool) {
      void runLocalizedRecalc({
        blockIds: [id],
        tabs: ["recruitment", "format"],
        eligibility: true,
      });
    }
  };

  const title = studyTitle(
    draft.ops.studyTitle || draft.objectiveText,
    draft.criteria[0]?.attributeLabel,
  );

  return (
    <div
      className={[
        styles.page,
        maestroCollapsed ? styles.pageCollapsed : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.back}
            onClick={() => navigate("/v2")}
            aria-label={messages.v2StudioBack}
          >
            <ArrowLeftIcon size={20} />
          </button>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>{title}</h1>
            <Badge color="gray" size="sm">
              {messages.estudosDraftBadge}
            </Badge>
          </div>
          <Button variant="clear" size="medium" onClick={switchToV1}>
            Fluxo atual
          </Button>
        </div>

        <Tabs
          className={styles.tabs}
          aria-label="Partes do estudo"
          items={tabItems}
          value={draft.activeTab}
          onChange={(id) => setActiveTab(id as StudyTabId)}
        />

        <div className={styles.headerRight}>
          <Button
            variant="filled"
            size="medium"
            onClick={() => setLaunchOpen(true)}
          >
            {messages.v2LaunchShort}
          </Button>
        </div>
      </header>

      <div className={styles.workspace}>
        <div className={styles.maestroCol}>
          <MaestroPanel
            collapsed={maestroCollapsed}
            onToggle={() => setMaestroCollapsed((c) => !c)}
            activeTabLabel={activeTabLabel}
          />
        </div>

        <main className={styles.doc}>
          <DocumentPane
            activeTab={draft.activeTab}
            draft={draft}
            blocks={tabBlocks}
            onChange={onBlockChange}
            onConfirm={confirmBlock}
            onRemove={removeBlock}
            onAdd={addBlock}
            onSetOptionMark={setOptionMark}
            countsByCriterion={countsByCriterion}
            emptyTitle={
              draft.activeTab === "screener"
                ? messages.v3ScreenerEmpty
                : messages.v2DocEmpty
            }
            onConfirmCriterion={confirmCriterion}
            onRemoveCriterion={removeCriterion}
            onResolveAmbiguity={resolveAmbiguity}
            onTogglePolarity={(id) => {
              const c = draft.criteria.find((x) => x.id === id);
              if (!c) return;
              updateCriterion(id, {
                polarity: c.polarity === "include" ? "exclude" : "include",
              });
            }}
          />
        </main>
      </div>

      <LaunchModal
        draft={draft}
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        onLaunch={() => launchStudy(currentTeam?.id)}
        onConfirmAll={confirmAllSuggested}
        onLaunched={(id) => navigate(`/v2/estudos/${id}`)}
      />
    </div>
  );
}
