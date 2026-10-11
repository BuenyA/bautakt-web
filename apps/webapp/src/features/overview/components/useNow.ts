import { useEffect, useState } from 'react';

/** Die aktuelle Uhrzeit, jede Minute neu — für Jetzt-Linie und „läuft“. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
