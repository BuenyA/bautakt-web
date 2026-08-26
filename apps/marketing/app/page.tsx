import { Button, Card, CardContent, CardHeader, CardTitle } from '@bautakt/ui';

/** Platzhalter. Wird in der naechsten Phase durch die echten Seiten ersetzt. */
export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Bautakt</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Fundament steht.</p>
          <Button>Weiter</Button>
        </CardContent>
      </Card>
    </main>
  );
}
