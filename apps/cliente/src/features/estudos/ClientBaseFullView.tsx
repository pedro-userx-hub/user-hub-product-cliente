import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Badge,
  EmptyState,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@userx/ui";
import { messages } from "../../lib/messages";
import type { ClientBaseContact } from "../../lib/studyRecruitment";
import { fetchClientBaseFull } from "../../lib/studyRecruitmentApi";
import styles from "./ClientBaseFullView.module.css";

function genderLabel(g: ClientBaseContact["gender"]): string {
  if (g === "f") return messages.estudosRecrutamentoFilterGenderF;
  if (g === "m") return messages.estudosRecrutamentoFilterGenderM;
  return messages.estudosRecrutamentoFilterGenderOther;
}

export function ClientBaseFullView() {
  const { studyId = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [studyName, setStudyName] = useState("");
  const [contacts, setContacts] = useState<ClientBaseContact[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void fetchClientBaseFull(studyId)
      .then((data) => {
        if (cancelled) return;
        setStudyName(data.studyName);
        setContacts(data.contacts);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studyId]);

  return (
    <div className={styles.page}>
      <PageHeader title={messages.estudosRecrutamentoClientBaseFullTitle} />
      <p className={styles.intro}>
        {studyName
          ? messages.estudosRecrutamentoClientBaseFullIntro(studyName)
          : messages.estudosRecrutamentoClientBaseFullIntroFallback}
      </p>

      {loading ? (
        <div className={styles.loading} aria-busy="true">
          <Skeleton height={40} />
          <Skeleton height={320} />
        </div>
      ) : error ? (
        <EmptyState
          variant="error"
          title={messages.estudosRecrutamentoClientBaseFullError}
        />
      ) : contacts.length === 0 ? (
        <EmptyState title={messages.estudosRecrutamentoNoClientBase} />
      ) : (
        <>
          <p className={styles.count}>
            {messages.estudosRecrutamentoClientBaseFullCount(contacts.length)}
          </p>
          <div className={styles.tableWrap}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>
                    {messages.estudosRecrutamentoColName}
                  </TableHeaderCell>
                  <TableHeaderCell>
                    {messages.estudosRecrutamentoColEmail}
                  </TableHeaderCell>
                  <TableHeaderCell>
                    {messages.estudosRecrutamentoColPhone}
                  </TableHeaderCell>
                  <TableHeaderCell>
                    {messages.estudosRecrutamentoColCompany}
                  </TableHeaderCell>
                  <TableHeaderCell>
                    {messages.estudosRecrutamentoColCity}
                  </TableHeaderCell>
                  <TableHeaderCell>
                    {messages.estudosRecrutamentoColAge}
                  </TableHeaderCell>
                  <TableHeaderCell>
                    {messages.estudosRecrutamentoColGender}
                  </TableHeaderCell>
                  <TableHeaderCell>
                    {messages.estudosRecrutamentoColSegment}
                  </TableHeaderCell>
                  <TableHeaderCell>
                    {messages.estudosRecrutamentoColNotes}
                  </TableHeaderCell>
                  <TableHeaderCell>
                    {messages.estudosRecrutamentoColInviteStatus}
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className={styles.name}>{c.name}</span>
                    </TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.company}</TableCell>
                    <TableCell>
                      {c.city}/{c.state}
                    </TableCell>
                    <TableCell>{c.age}</TableCell>
                    <TableCell>{genderLabel(c.gender)}</TableCell>
                    <TableCell>{c.segment}</TableCell>
                    <TableCell>
                      <span className={styles.notes}>{c.notes}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        color={c.alreadyInvited ? "yellow" : "green"}
                        size="sm"
                      >
                        {c.alreadyInvited
                          ? messages.estudosRecrutamentoClientBaseAlreadyInvited
                          : messages.estudosRecrutamentoClientBaseAvailable}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
