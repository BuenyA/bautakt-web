# 2026-11-01 Nur noch CLAUDE.md, keine AGENTS.md

Owner-Wunsch: Jede Projektanweisung steht in genau einer Datei. Bisher verwiesen die
`CLAUDE.md` auf eine `AGENTS.md`.

- `AGENTS.md`, `apps/marketing/AGENTS.md` und `apps/webapp/AGENTS.md` sind in die
  jeweilige `CLAUDE.md` übernommen und gelöscht. Die Attributionsregel aus der alten
  `CLAUDE.md` steht jetzt oben in der Wurzel-`CLAUDE.md`.
- Verweise in README, Wiki-Seiten, `.gitignore`, `.env.example` und Skripten zeigen auf
  `CLAUDE.md`. Ältere Logs bleiben unverändert, sie beschreiben den damaligen Stand.
- `next dev` (Next 16.3) schreibt seinen `nextjs-agent-rules`-Block in die `AGENTS.md`,
  solange es eine gibt, sonst in die `CLAUDE.md`. Deshalb darf neben
  `apps/marketing/CLAUDE.md` keine neue `AGENTS.md` entstehen.
- In bautakt-app passiert dasselbe in einem eigenen PR.
