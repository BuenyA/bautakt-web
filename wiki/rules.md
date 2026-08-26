# Wiki-Regeln

Wie dieses Wiki geführt wird. Die Verpflichtung dazu und das _Warum_ stehen in
[AGENTS.md](../AGENTS.md). **Bei Widerspruch gilt AGENTS.md.**

## Aufbau

| Pfad       | Rolle                                                                                |
| ---------- | ------------------------------------------------------------------------------------ |
| `index.md` | Einstieg. Jede Seite ist von hier erreichbar.                                        |
| `rules.md` | Diese Datei.                                                                         |
| `pages/`   | Zeitloses Wissen über ein Subsystem.                                                 |
| `logs/`    | Datierte Berichte: was wurde geändert und warum. Namensform `YYYY-MM-DD-<thema>.md`. |

## Schreibregeln

- **Semantisches und episodisches Gedächtnis trennen.** `pages/` hält zeitlose Aussagen,
  `logs/` datierte Vorgänge. Vermischt man beides, werden Seiten zu Changelogs — und ein
  Changelog lässt sich nicht als Tatsachenaussage lesen.
- **Eine Seite, ein Begriff, stabiler Dateiname.** Der Name ist der Bezeichner, gegen den
  andere Seiten verlinken. Umbenennen nur mit Grund, und die eingehenden Links in
  derselben Änderung mitziehen.
- **Konsolidieren statt anhängen.** Berührt neues Wissen eine bestehende Seite, wird die
  Seite umgeschrieben, sodass sie als eine gegenwärtige Aussage liest.
- **Jede Behauptung trägt ihre Herkunft.** Ein Codeverweis (`datei.ts:42`), ein
  gemessenes Ergebnis, oder die ausdrückliche Kennzeichnung als Annahme.
- **Alles Veränderliche datieren.** Zahlen, Remote-Einstellungen, Zustände. Was am
  26.08. galt, muss heute nicht gelten, und eine undatierte Zahl liest sich als dauerhaft.
- **Für das Wiederfinden schreiben.** Sprechende Überschriften, die Aussage im ersten
  Satz, die Wörter, nach denen jemand tatsächlich suchen würde.
- **Widerlegungen festhalten, nicht löschen.** Wenn sich eine Annahme als falsch
  herausstellt, wird sie korrigiert _und_ der Irrweg dokumentiert. Negatives Wissen ist
  das teure — wer es still entfernt, lässt den Nächsten dafür noch einmal bezahlen.
- **Nie eine Quelle der Wahrheit duplizieren.** Dateistruktur, Signaturen und
  Commit-Historie stehen im Code. Alles zu Schema, RLS, Berechtigungen und Grants steht
  im Wiki von `bautakt-app` und wird hier **per URL verlinkt**, nie kopiert. Divergente
  Kopien werden zu Fallen.

## Aufgaben gehören nach GitHub

Offene Punkte sind Issues in `BuenyA/bautakt-web`, keine Listen im Wiki. Eine
Erkenntnis kommt nur dann ins Wiki, wenn sie etwas über das System _erklärt_ — dann mit
der Issue-Nummer daneben. Was nur eine Aufgabe ist, gehört nicht hierher.

## Definition of Done

Eine nicht triviale Änderung ist fertig, wenn die betroffene Seite in `pages/` die neue
Wirklichkeit beschreibt und ein Eintrag in `logs/` sagt, was sich geändert hat und warum.
