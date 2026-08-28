import { useEffect, useMemo, useState } from "react";
import {
  AlertCard,
  Badge,
  Button,
  ChoiceCards,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Input,
  Skeleton,
  TextArea,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  RECRUITMENT_CHANNELS,
  type IdealProfile,
  type IdealProfileCriterion,
  type RecruitmentBaseOrigin,
  type RecruitmentCandidate,
  type RecruitmentChannelKind,
} from "../../lib/studyRecruitment";
import {
  createRecruitmentWave,
  fetchClientBaseCandidates,
  fetchUserxEligible,
  type CreateRecruitmentWaveInput,
} from "../../lib/studyRecruitmentApi";
import type { StudyRecruitmentState } from "../../lib/studyRecruitment";
import type { TeamStudy } from "../../lib/teamApi";
import styles from "./RecruitWaveDrawer.module.css";

export interface RecruitWaveDrawerProps {
  open: boolean;
  study: TeamStudy;
  idealProfile: IdealProfile;
  hasClientBase: boolean;
  onClose: () => void;
  onCreated: (state: StudyRecruitmentState) => void;
}

type Step = "profile" | "origin" | "sample" | "select" | "channels";

const STEPS: Step[] = ["profile", "origin", "sample", "select", "channels"];

function channelLabel(kind: RecruitmentChannelKind): string {
  switch (kind) {
    case "link":
      return messages.estudosRecrutamentoChannelLink;
    case "email":
      return messages.estudosRecrutamentoChannelEmail;
    case "embed":
      return messages.estudosRecrutamentoChannelEmbed;
    case "qr_code":
      return messages.estudosRecrutamentoChannelQr;
    case "whatsapp":
      return messages.estudosRecrutamentoChannelWhatsapp;
    case "sms":
      return messages.estudosRecrutamentoChannelSms;
    case "voice":
      return messages.estudosRecrutamentoChannelVoice;
  }
}

function stepTitle(step: Step): string {
  switch (step) {
    case "profile":
      return messages.estudosRecrutamentoStepProfile;
    case "origin":
      return messages.estudosRecrutamentoStepOrigin;
    case "sample":
      return messages.estudosRecrutamentoStepSample;
    case "select":
      return messages.estudosRecrutamentoStepSelect;
    case "channels":
      return messages.estudosRecrutamentoStepChannels;
  }
}

export function RecruitWaveDrawer({
  open,
  study,
  idealProfile,
  hasClientBase,
  onClose,
  onCreated,
}: RecruitWaveDrawerProps) {
  const [step, setStep] = useState<Step>("profile");
  const [profileText, setProfileText] = useState("");
  const [origin, setOrigin] = useState<RecruitmentBaseOrigin | "">("");
  const [sample, setSample] = useState("");
  const [sampleError, setSampleError] = useState<string | undefined>();
  const [originError, setOriginError] = useState<string | undefined>();
  const [selectError, setSelectError] = useState<string | undefined>();
  const [channelError, setChannelError] = useState<string | undefined>();
  const [candidates, setCandidates] = useState<RecruitmentCandidate[]>([]);
  const [eligibleTotal, setEligibleTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | undefined>();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [channels, setChannels] = useState<Set<RecruitmentChannelKind>>(
    () => new Set(["link"]),
  );
  const [listNonce, setListNonce] = useState(0);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const dirty =
    Boolean(profileText.trim()) ||
    origin !== "" ||
    sample.trim().length > 0 ||
    selected.size > 0 ||
    step !== "profile";

  useEffect(() => {
    if (!open) return;
    setStep("profile");
    setProfileText(idealProfile.summary || "");
    /** Origem única disponível: pré-selecionar (Story 3 edge). */
    if (!hasClientBase) {
      setOrigin("userx");
    } else if (study.recruitmentSource === "own") {
      setOrigin("client");
    } else {
      setOrigin("userx");
    }
    setSample(
      study.participantQuantity != null
        ? String(study.participantQuantity)
        : "",
    );
    setSampleError(undefined);
    setOriginError(undefined);
    setSelectError(undefined);
    setChannelError(undefined);
    setCandidates([]);
    setEligibleTotal(0);
    setSelected(new Set());
    setChannels(new Set(["link"]));
    setListError(undefined);
    setListNonce(0);
    setDiscardOpen(false);
  }, [open, idealProfile, hasClientBase, study]);

  useEffect(() => {
    if (!open || step !== "select" || !origin) return;
    let cancelled = false;
    setLoadingList(true);
    setListError(undefined);
    const load =
      origin === "userx"
        ? fetchUserxEligible(study.id)
        : fetchClientBaseCandidates(study.id);
    void load
      .then((res) => {
        if (cancelled) return;
        setCandidates(res.candidates);
        setEligibleTotal(res.total);
        setSelected(new Set(res.candidates.map((c) => c.id)));
      })
      .catch(() => {
        if (cancelled) return;
        setCandidates([]);
        setEligibleTotal(0);
        setListError(messages.estudosRecrutamentoEligibleLoadError);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, step, origin, study.id, listNonce, profileText]);

  const criteria: IdealProfileCriterion[] = useMemo(() => {
    if (idealProfile.criteria.length === 0) return [];
    return idealProfile.criteria.map((c) =>
      c.id === "profile"
        ? { ...c, value: profileText.trim() || c.value }
        : c,
    );
  }, [idealProfile.criteria, profileText]);

  const sampleNum = Number(sample);
  const gapBelowSample =
    origin === "userx" &&
    eligibleTotal > 0 &&
    Number.isFinite(sampleNum) &&
    sampleNum > 0 &&
    eligibleTotal < sampleNum;

  const requestClose = () => {
    if (dirty && !saving) setDiscardOpen(true);
    else onClose();
  };

  const goNext = () => {
    if (step === "profile") {
      setStep("origin");
      return;
    }
    if (step === "origin") {
      if (!origin) {
        setOriginError(messages.estudosRecrutamentoOriginRequired);
        return;
      }
      if (origin === "client" && !hasClientBase) {
        setOriginError(messages.estudosRecrutamentoNoClientBase);
        return;
      }
      setOriginError(undefined);
      setStep("sample");
      return;
    }
    if (step === "sample") {
      if (!sample.trim() || !Number.isFinite(sampleNum) || sampleNum <= 0) {
        setSampleError(messages.estudosRecrutamentoSampleRequired);
        return;
      }
      setSampleError(undefined);
      setStep("select");
      return;
    }
    if (step === "select") {
      if (selected.size === 0) {
        setSelectError(messages.estudosRecrutamentoSelectionRequired);
        return;
      }
      setSelectError(undefined);
      setStep("channels");
      return;
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]!);
  };

  const launch = async () => {
    const active = [...channels].filter(
      (k) => !RECRUITMENT_CHANNELS.find((c) => c.kind === k)?.soon,
    );
    if (active.length === 0) {
      setChannelError(messages.estudosRecrutamentoNoChannel);
      return;
    }
    setChannelError(undefined);
    setSaving(true);
    try {
      const input: CreateRecruitmentWaveInput = {
        origin: origin as RecruitmentBaseOrigin,
        sampleTarget: sampleNum,
        profileSummary: profileText.trim(),
        profileCriteria: criteria,
        selectedIds: [...selected],
        channelKinds: active,
      };
      const next = await createRecruitmentWave(study.id, input);
      onCreated(next);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const originOptions = [
    {
      id: "userx",
      title: messages.estudosRecrutamentoOriginUserxTitle,
      description: messages.estudosRecrutamentoOriginUserxDesc,
    },
    ...(hasClientBase
      ? [
          {
            id: "client",
            title: messages.estudosRecrutamentoOriginClientTitle,
            description: messages.estudosRecrutamentoOriginClientDesc,
          },
        ]
      : []),
  ];

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        title={messages.estudosRecrutamentoDrawerTitle}
        size="default"
        footer={
          <>
            <Button
              variant="clear"
              size="large"
              disabled={saving}
              onClick={step === "profile" ? requestClose : goBack}
            >
              {step === "profile"
                ? messages.estudosRecrutamentoCancel
                : messages.estudosRecrutamentoBack}
            </Button>
            {step === "channels" ? (
              <Button
                variant="filled"
                size="large"
                loading={saving}
                onClick={() => void launch()}
              >
                {messages.estudosRecrutamentoLaunch}
              </Button>
            ) : (
              <Button
                variant="filled"
                size="large"
                disabled={saving}
                onClick={goNext}
              >
                {messages.estudosRecrutamentoNext}
              </Button>
            )}
          </>
        }
      >
        <div className={styles.body}>
          <p className={styles.stepLabel}>{stepTitle(step)}</p>

          {step === "profile" && (
            <div className={styles.stack}>
              {idealProfile.inherited && !idealProfile.partial && (
                <Badge color="brand" size="sm">
                  {messages.estudosRecrutamentoIdealInherited}
                </Badge>
              )}
              {idealProfile.partial && (
                <AlertCard variant="warning">
                  {messages.estudosRecrutamentoIdealEmpty}
                </AlertCard>
              )}
              <TextArea
                label={messages.estudosRecrutamentoProfileLabel}
                helperText={messages.estudosRecrutamentoProfileHint}
                placeholder={messages.estudosRecrutamentoProfilePlaceholder}
                value={profileText}
                onChange={(e) => setProfileText(e.target.value)}
                rows={5}
              />
              {criteria.length > 0 && (
                <ul className={styles.criteria}>
                  {criteria.map((c) => (
                    <li key={c.id} className={styles.criterion}>
                      <span className={styles.criterionLabel}>{c.label}</span>
                      <span className={styles.criterionValue}>{c.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === "origin" && (
            <div className={styles.stack}>
              <ChoiceCards
                layout="list"
                value={origin || undefined}
                options={originOptions}
                onChange={(v) => {
                  setOrigin(v as RecruitmentBaseOrigin);
                  setOriginError(undefined);
                }}
              />
              {!hasClientBase && (
                <p className={styles.hint}>
                  {messages.estudosRecrutamentoNoClientBase}
                </p>
              )}
              {originError && (
                <AlertCard variant="warning">{originError}</AlertCard>
              )}
            </div>
          )}

          {step === "sample" && (
            <div className={styles.stack}>
              <Input
                label={messages.estudosRecrutamentoSampleLabel}
                placeholder={messages.estudosRecrutamentoSamplePlaceholder}
                value={sample}
                error={sampleError}
                inputMode="numeric"
                onChange={(e) => {
                  setSample(e.target.value.replace(/[^\d]/g, ""));
                  setSampleError(undefined);
                }}
              />
            </div>
          )}

          {step === "select" && (
            <div className={styles.stack}>
              {loadingList && (
                <div className={styles.loading} aria-busy="true">
                  <Skeleton height={48} />
                  <Skeleton height={160} />
                </div>
              )}
              {!loadingList && listError && (
                <EmptyState
                  variant="error"
                  title={listError}
                  action={
                    <Button
                      variant="clear"
                      size="medium"
                      onClick={() => setListNonce((n) => n + 1)}
                    >
                      {messages.estudosRecrutamentoRetry}
                    </Button>
                  }
                />
              )}
              {!loadingList && !listError && eligibleTotal === 0 && (
                <EmptyState
                  title={
                    origin === "client"
                      ? messages.estudosRecrutamentoNoClientBase
                      : messages.estudosRecrutamentoNoEligible
                  }
                />
              )}
              {!loadingList && !listError && eligibleTotal > 0 && (
                <>
                  <div className={styles.selectHead}>
                    <p className={styles.eligible}>
                      {messages.estudosRecrutamentoEligibleCount(eligibleTotal)}
                    </p>
                    <div className={styles.selectActions}>
                      <Button
                        variant="clear"
                        size="medium"
                        onClick={() =>
                          setSelected(new Set(candidates.map((c) => c.id)))
                        }
                      >
                        {messages.estudosRecrutamentoSelectAll}
                      </Button>
                      <Button
                        variant="clear"
                        size="medium"
                        onClick={() => setSelected(new Set())}
                      >
                        {messages.estudosRecrutamentoClearSelection}
                      </Button>
                    </div>
                  </div>
                  {gapBelowSample && (
                    <AlertCard variant="warning">
                      {messages.estudosRecrutamentoEligibleGap(
                        eligibleTotal,
                        sampleNum,
                      )}
                    </AlertCard>
                  )}
                  <ul className={styles.candidateList}>
                    {candidates.map((c) => {
                      const on = selected.has(c.id);
                      return (
                        <li key={c.id}>
                          <label className={styles.candidate}>
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => {
                                setSelected((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(c.id)) next.delete(c.id);
                                  else next.add(c.id);
                                  return next;
                                });
                                setSelectError(undefined);
                              }}
                            />
                            <span className={styles.candidateText}>
                              <span className={styles.candidateName}>
                                {c.name}
                              </span>
                              <span className={styles.candidateEmail}>
                                {c.email}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
              {selectError && (
                <AlertCard variant="warning">{selectError}</AlertCard>
              )}
            </div>
          )}

          {step === "channels" && (
            <div className={styles.stack}>
              <p className={styles.hint}>
                {messages.estudosRecrutamentoChannelsHint}
              </p>
              <ul className={styles.channelList}>
                {RECRUITMENT_CHANNELS.map((ch) => {
                  const on = channels.has(ch.kind);
                  return (
                    <li key={ch.kind}>
                      <label
                        className={`${styles.channel}${
                          ch.soon ? ` ${styles.channelSoon}` : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on && !ch.soon}
                          disabled={ch.soon}
                          onChange={() => {
                            if (ch.soon) return;
                            setChannels((prev) => {
                              const next = new Set(prev);
                              if (next.has(ch.kind)) next.delete(ch.kind);
                              else next.add(ch.kind);
                              return next;
                            });
                            setChannelError(undefined);
                          }}
                        />
                        <span>{channelLabel(ch.kind)}</span>
                        {ch.soon ? (
                          <Badge color="gray" size="sm">
                            {messages.estudosRecrutamentoChannelSoon}
                          </Badge>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
              {channelError && (
                <AlertCard variant="warning">{channelError}</AlertCard>
              )}
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={discardOpen}
        title={messages.estudosRecrutamentoDiscardTitle}
        message={messages.estudosRecrutamentoDiscardBody}
        confirmLabel={messages.estudosRecrutamentoDiscardConfirm}
        cancelLabel={messages.estudosRecrutamentoCancel}
        destructive
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          onClose();
        }}
      />
    </>
  );
}
