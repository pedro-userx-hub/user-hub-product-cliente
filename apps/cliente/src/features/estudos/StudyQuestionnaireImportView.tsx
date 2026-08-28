import { DownloadIcon, LinkIcon, UploadIcon } from "@userx/ui";
import { messages } from "../../lib/messages";
import {
  type StudyQuestionnaireImport,
  type TeamStudy,
} from "../../lib/teamApi";
import styles from "./StudyQuestionnaireImportView.module.css";

export interface StudyQuestionnaireImportViewProps {
  study: TeamStudy;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadQuestionnaireFile(fileName: string) {
  const blob = new Blob([], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ImportRow({ item }: { item: StudyQuestionnaireImport }) {
  const isFile = item.kind === "file";

  const handleDownload = () => {
    if (isFile && item.file) {
      downloadQuestionnaireFile(item.file.name);
      return;
    }
    if (item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={styles.row}>
      <div className={styles.iconWrap} aria-hidden>
        {isFile ? <UploadIcon size={24} /> : <LinkIcon size={24} />}
      </div>
      <div className={styles.meta}>
        <span className={styles.label} title={item.label}>
          {item.label}
        </span>
        <span className={styles.sub}>
          {isFile && item.file ? formatBytes(item.file.size) : item.url}
        </span>
      </div>
      <button
        type="button"
        className={styles.downloadBtn}
        aria-label={
          isFile
            ? messages.estudosOnlineSurveyDownloadFile(item.label)
            : messages.estudosOnlineSurveyOpenLink
        }
        onClick={handleDownload}
      >
        <DownloadIcon size={20} />
      </button>
    </div>
  );
}

/**
 * Leitura dos arquivos/links enviados no passo de questionário online.
 */
export function StudyQuestionnaireImportView({
  study,
}: StudyQuestionnaireImportViewProps) {
  const imports = study.questionnaireImports ?? [];
  const fileImports = imports.filter((item) => item.kind === "file");
  const linkImports = imports.filter((item) => item.kind === "link");

  return (
    <div className={styles.root}>
      {imports.length === 0 ? (
        <p className={styles.empty}>{messages.estudosDetailNotConfigured}</p>
      ) : (
        <div className={styles.lists}>
          {fileImports.length > 0 && (
            <section className={styles.listBlock}>
              <h3 className={styles.listTitle}>
                {messages.estudosOnlineSurveyFilesSent(fileImports.length)}
              </h3>
              {fileImports.map((item) => (
                <ImportRow key={item.id} item={item} />
              ))}
            </section>
          )}
          {linkImports.length > 0 && (
            <section className={styles.listBlock}>
              <h3 className={styles.listTitle}>
                {messages.estudosOnlineSurveyLinksSent(linkImports.length)}
              </h3>
              {linkImports.map((item) => (
                <ImportRow key={item.id} item={item} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
