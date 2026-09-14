/**
 * Atmosfera de entrada — degradê roxo suave animado (framer-motion).
 * Estilo próximo a produtos AI (Claude / ChatGPT): blobs + mesh gradient.
 */
import { motion, useReducedMotion } from "framer-motion";
import styles from "./AiCoreAtmosphere.module.css";

export function AiCoreAtmosphere() {
  const reduce = useReducedMotion();

  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.base} />

      <motion.div
        className={styles.blobA}
        animate={
          reduce
            ? undefined
            : {
                x: [0, 48, -24, 0],
                y: [0, -36, 28, 0],
                scale: [1, 1.12, 0.94, 1],
              }
        }
        transition={
          reduce
            ? undefined
            : { duration: 18, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <motion.div
        className={styles.blobB}
        animate={
          reduce
            ? undefined
            : {
                x: [0, -56, 32, 0],
                y: [0, 40, -28, 0],
                scale: [1, 0.9, 1.15, 1],
              }
        }
        transition={
          reduce
            ? undefined
            : { duration: 22, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <motion.div
        className={styles.blobC}
        animate={
          reduce
            ? undefined
            : {
                x: [0, 28, -40, 0],
                y: [0, -20, 36, 0],
                scale: [1, 1.08, 0.96, 1],
              }
        }
        transition={
          reduce
            ? undefined
            : { duration: 16, repeat: Infinity, ease: "easeInOut" }
        }
      />

      <div className={styles.veil} />
    </div>
  );
}
