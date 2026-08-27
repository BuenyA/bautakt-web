# AGENTS.md

**Die verbindlichen Regeln fuer dieses Repo stehen in [../../AGENTS.md](../../AGENTS.md).**

Kurz die Punkte, die genau hier am haeufigsten schiefgehen:

- Der `AuthProvider` traegt drei Fallstricke, die im Modulkopf dokumentiert und
  bewusst eingebaut sind: das `initializing`-Flag, kein `await` im
  `onAuthStateChange`-Callback und `queryClient.clear()` beim Abmelden. Keinen
  davon entfernen.
- Jeder `queryKey` beginnt mit dem Mandanten (`companyId`, bei nutzerbezogenen
  Daten `userId`).
- `usePermission` blendet Oberflaeche aus. Das ist Fuehrung, keine Kontrolle —
  die verbindliche Grenze sind die RLS-Policies.
- `vercel.json` ist nicht optional. Ohne den Rewrite auf `index.html` gibt jeder
  Direktaufruf einer Unterroute in Produktion einen 404. Lokal faellt das nie auf.
