import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.eyebrow}>Bautakt</p>
        <h1>Modern Construction Workflows, Built for Growing Teams.</h1>
        <p>
          Bautakt helps teams manage projects, timelines, and communication in one
          place. This Next.js marketing app is ready for deployment on Vercel and
          can be connected to the bautakt.com domain.
        </p>
        <div className={styles.ctas}>
          <a className={styles.primary} href="https://bautakt.com" target="_blank" rel="noreferrer">
            Visit bautakt.com
          </a>
          <a className={styles.secondary} href="https://vercel.com" target="_blank" rel="noreferrer">
            Deploy on Vercel
          </a>
        </div>
      </main>
    </div>
  );
}
