import { useProductVersion } from "./ProductVersionContext";
import styles from "./V2Placeholder.module.css";

/**
 * Placeholder da versão 2.0 (IA Centrada) até os specs chegarem.
 */
export function V2Placeholder() {
  const { setVersionId } = useProductVersion();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.badge}>Versão 2.0</p>
        <h1 className={styles.title}>IA Centrada</h1>
        <p className={styles.body}>
          Evolução do hub com experiência centrada em IA. Os specs desta versão
          ainda não foram aplicados — quando você enviar, montamos aqui.
        </p>
        <button
          type="button"
          className={styles.back}
          onClick={() => setVersionId("1.0")}
        >
          Voltar para a versão 1.0
        </button>
      </div>
    </div>
  );
}
