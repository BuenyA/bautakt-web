/**
 * Bootstrap-Fehlerseite, wenn die App ohne gueltige VITE_*-Env gebaut wurde.
 *
 * ⚠️ Bewusst hardcoded auf Deutsch, ohne i18next: Das ist der eine Fall, in dem
 * die App-Konfiguration selbst kaputt ist. Die Meldung muss auch dann sichtbar
 * sein, wenn der uebrige App-Baum (Router, Provider, Kataloge) nicht mountet.
 * Sobald Env steht, wird diese Seite nie gerendert.
 */
export function BootErrorPage({ message }: { message: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <p className="text-sm font-medium text-primary">Bautakt</p>
      <h1 className="text-2xl font-semibold tracking-tight">Konfiguration fehlt</h1>
      <p className="max-w-lg text-muted-foreground">
        Die Web-App wurde ohne Supabase-Umgebungsvariablen gebaut. Ohne Redeploy nach dem Setzen der
        Variablen bleibt das Bundle leer.
      </p>
      <pre className="mt-2 max-w-xl overflow-x-auto rounded-md bg-surface p-4 text-left text-xs text-foreground whitespace-pre-wrap">
        {message}
      </pre>
      <p className="max-w-lg text-sm text-muted-foreground">
        Owner: In Vercel unter bautakt-webapp die Variablen{' '}
        <code className="text-foreground">VITE_SUPABASE_URL</code> und{' '}
        <code className="text-foreground">VITE_SUPABASE_ANON_KEY</code> setzen, Production neu
        deployen.
      </p>
    </div>
  );
}
