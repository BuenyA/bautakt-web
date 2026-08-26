# @bautakt/app

Die Web-Anwendung von Bautakt (`app.bautakt.com`). Vite + React + React Router.

Alle Befehle laufen aus der **Repo-Wurzel**, nicht aus diesem Ordner:

```bash
npm run dev:app        # http://localhost:5173
npm run build          # baut beide Apps
```

Vor dem ersten Start eine `.env` aus `.env.example` anlegen.

⚠️ **Die `vercel.json` ist nicht optional.** Ohne den Rewrite auf `index.html`
liefert jeder direkte Aufruf einer Unterroute (z. B. ein Reload auf
`/auftraege`) einen 404 von Vercel. Lokal faellt das nie auf, weil der
Vite-Dev-Server ohnehin alles auf `index.html` leitet — der Fehler tritt
ausschliesslich in Produktion auf.

Architektur und Regeln stehen in der [AGENTS.md](../../AGENTS.md) der Repo-Wurzel.
