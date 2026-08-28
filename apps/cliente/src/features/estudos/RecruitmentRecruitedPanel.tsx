import { useMemo, useState } from "react";
import {
  Badge,
  ConfirmDialog,
  EmptyState,
  Menu,
  MultiSelect,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
  type MenuItemConfig,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import { resendScreenerEmailInvites } from "../../lib/screenerShareApi";
import type {
  RecruitedPerson,
  RecruitedPersonBase,
  RecruitedStatus,
  RecruitmentCampaignOption,
  RecruitmentChannelKind,
} from "../../lib/studyRecruitment";
import {
  recruitedStatusColor,
  recruitedStatusLabel,
} from "../../lib/studyRecruitment";
import styles from "./RecruitmentRecruitedPanel.module.css";

export interface RecruitmentRecruitedPanelProps {
  recruited: RecruitedPerson[];
  campaigns: RecruitmentCampaignOption[];
  studyId: string;
  onResent?: () => void;
  /**
   * `collector` — drawer de um coletor: só status no filtro;
   * colunas nome / e-mail / status.
   */
  variant?: "study" | "collector";
}

type BaseFilter = "all" | RecruitedPersonBase;
type StatusFilter = "all" | RecruitedStatus;
type ChannelFilter = "all" | RecruitmentChannelKind;

const STATUS_OPTIONS: RecruitedStatus[] = [
  "convidado",
  "visualizou",
  "em_andamento",
  "respondido",
  "desistiu",
  "ignorou",
];

const CHANNEL_OPTIONS: RecruitmentChannelKind[] = [
  "link",
  "email",
  "embed",
  "whatsapp",
];

function channelLabel(kind: RecruitmentChannelKind): string {
  switch (kind) {
    case "link":
      return messages.estudosRecrutamentoChannelLink;
    case "email":
      return messages.estudosRecrutamentoChannelEmail;
    case "embed":
      return messages.estudosRecrutamentoChannelEmbed;
    case "whatsapp":
      return messages.estudosRecrutamentoChannelWhatsappActive;
    default:
      return kind;
  }
}

function baseLabel(origin: RecruitedPersonBase): string {
  switch (origin) {
    case "userx":
      return messages.estudosRecrutamentoBaseUserx;
    case "client":
      return messages.estudosRecrutamentoBaseClient;
    case "outside":
      return messages.estudosRecrutamentoBaseOutside;
  }
}

export function RecruitmentRecruitedPanel({
  recruited,
  campaigns,
  studyId,
  onResent,
  variant = "study",
}: RecruitmentRecruitedPanelProps) {
  const isCollector = variant === "collector";
  const { showToast } = useToast();
  const [baseFilter, setBaseFilter] = useState<BaseFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [campaignFilter, setCampaignFilter] = useState<string[]>([]);
  const [confirmResend, setConfirmResend] = useState<RecruitedPerson | null>(
    null,
  );

  const filtered = useMemo(() => {
    return recruited.filter((p) => {
      if (!isCollector && baseFilter !== "all" && p.baseOrigin !== baseFilter) {
        return false;
      }
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (
        !isCollector &&
        channelFilter !== "all" &&
        p.channel !== channelFilter
      ) {
        return false;
      }
      if (
        !isCollector &&
        campaignFilter.length > 0 &&
        !campaignFilter.includes(p.campaignId)
      ) {
        return false;
      }
      return true;
    });
  }, [
    recruited,
    isCollector,
    baseFilter,
    statusFilter,
    channelFilter,
    campaignFilter,
  ]);

  const campaignOptions = campaigns.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  async function handleResend(person: RecruitedPerson) {
    if (!person.canResend || !person.email) return;
    if (person.status === "respondido") {
      setConfirmResend(person);
      return;
    }
    await doResend(person);
  }

  async function doResend(person: RecruitedPerson) {
    try {
      await resendScreenerEmailInvites(studyId, person.campaignId, [
        person.email,
      ]);
      showToast({
        type: "success",
        title: messages.estudosRecrutamentoResendToast,
      });
      onResent?.();
    } finally {
      setConfirmResend(null);
    }
  }

  if (recruited.length === 0) {
    return <EmptyState title={messages.estudosRecrutamentoRecruitedEmptyV2} />;
  }

  const statusFilterField = (
    <div className={styles.filterField}>
      <label className={styles.filterLabel}>
        {messages.estudosRecrutamentoFilterStatus}
      </label>
      <Select
        value={statusFilter}
        onChange={(v) => setStatusFilter(v as StatusFilter)}
        options={[
          { value: "all", label: messages.estudosRecrutamentoFilterStatusAll },
          ...STATUS_OPTIONS.map((s) => ({
            value: s,
            label: recruitedStatusLabel(s),
          })),
        ]}
      />
    </div>
  );

  return (
    <div className={styles.panel}>
      <div className={styles.filters}>
        {statusFilterField}
        {!isCollector ? (
          <>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>
                {messages.estudosRecrutamentoFilterChannel}
              </label>
              <Select
                value={channelFilter}
                onChange={(v) => setChannelFilter(v as ChannelFilter)}
                options={[
                  {
                    value: "all",
                    label: messages.estudosRecrutamentoFilterChannelAll,
                  },
                  ...CHANNEL_OPTIONS.map((ch) => ({
                    value: ch,
                    label: channelLabel(ch),
                  })),
                ]}
              />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>
                {messages.estudosRecrutamentoFilterBase}
              </label>
              <Select
                value={baseFilter}
                onChange={(v) => setBaseFilter(v as BaseFilter)}
                options={[
                  {
                    value: "all",
                    label: messages.estudosRecrutamentoFilterBaseAll,
                  },
                  {
                    value: "userx",
                    label: messages.estudosRecrutamentoBaseUserx,
                  },
                  {
                    value: "client",
                    label: messages.estudosRecrutamentoBaseClient,
                  },
                  {
                    value: "outside",
                    label: messages.estudosRecrutamentoBaseOutside,
                  },
                ]}
              />
            </div>
            {campaignOptions.length > 1 ? (
              <div className={styles.filterField}>
                <span className={styles.filterLabel}>
                  {messages.estudosRecrutamentoFilterCampaign}
                </span>
                <MultiSelect
                  value={campaignFilter}
                  onChange={setCampaignFilter}
                  options={campaignOptions}
                  placeholder={messages.estudosRecrutamentoFilterCampaignAll}
                />
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={messages.estudosRecrutamentoRecruitedFilterEmpty} />
      ) : (
        <div className={styles.tableWrap}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>
                  {isCollector
                    ? messages.estudosRecrutamentoColName
                    : messages.estudosRecrutamentoColPerson}
                </TableHeaderCell>
                {isCollector ? (
                  <TableHeaderCell>
                    {messages.estudosRecrutamentoColEmail}
                  </TableHeaderCell>
                ) : null}
                <TableHeaderCell>
                  {messages.estudosRecrutamentoColStatus}
                </TableHeaderCell>
                {!isCollector ? (
                  <>
                    <TableHeaderCell>
                      {messages.estudosRecrutamentoColChannel}
                    </TableHeaderCell>
                    <TableHeaderCell>
                      {messages.estudosRecrutamentoColBase}
                    </TableHeaderCell>
                    <TableHeaderCell
                      aria-label={messages.estudosRecrutamentoColActions}
                    />
                  </>
                ) : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((person) => {
                const menuItems: MenuItemConfig[] = person.canResend
                  ? [
                      {
                        id: "resend",
                        label: messages.estudosRecrutamentoResendInvite,
                        onSelect: () => void handleResend(person),
                      },
                    ]
                  : [];

                if (isCollector) {
                  return (
                    <TableRow key={person.id}>
                      <TableCell>
                        <span className={styles.personName}>{person.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className={styles.personEmail}>
                          {person.email?.trim() ? person.email : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          color={recruitedStatusColor(person.status)}
                          size="sm"
                        >
                          {recruitedStatusLabel(person.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={person.id}>
                    <TableCell>
                      <div className={styles.personCell}>
                        <span className={styles.personName}>{person.name}</span>
                        {person.showEmail && person.email ? (
                          <span className={styles.personEmail}>
                            {person.email}
                          </span>
                        ) : null}
                        <span className={styles.campaignName}>
                          {person.campaignName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={recruitedStatusColor(person.status)}
                        size="sm"
                      >
                        {recruitedStatusLabel(person.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{channelLabel(person.channel)}</TableCell>
                    <TableCell>
                      <Badge color="gray" size="sm">
                        {baseLabel(person.baseOrigin)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {menuItems.length > 0 ? (
                        <Menu
                          ariaLabel={messages.estudosRecrutamentoRowMenu}
                          items={menuItems}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={confirmResend != null}
        title={messages.estudosRecrutamentoResendConfirmTitle}
        message={messages.estudosRecrutamentoResendConfirmBody}
        confirmLabel={messages.estudosRecrutamentoResendInvite}
        cancelLabel={messages.estudosRecrutamentoCancel}
        onConfirm={async () => {
          if (confirmResend) await doResend(confirmResend);
        }}
        onClose={() => setConfirmResend(null)}
      />
    </div>
  );
}
