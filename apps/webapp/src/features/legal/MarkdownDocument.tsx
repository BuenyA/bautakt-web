import { Badge, Link, makeStyles, Text, tokens } from '@fluentui/react-components';
import { Children, cloneElement, isValidElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import { RouterLink } from '@/components/common/RouterLink';

/**
 * Platzhalter im Quelltext bleiben wörtlich `{{TELEFON}}`. Gerendert werden
 * sie als Hinweis-Badge, damit die Lücke sichtbar ist, bis die Nummer
 * eingesetzt wird. Es gibt keine Ersetzung durch einen echten Wert.
 */
const OPEN_TOKEN = '{{TELEFON}}';

const useStyles = makeStyles({
  h1: { marginTop: tokens.spacingVerticalL },
  h2: { marginTop: tokens.spacingVerticalL },
  h3: { marginTop: tokens.spacingVerticalM },
});

function splitToken(text: string, keyBase: string): ReactNode {
  if (!text.includes(OPEN_TOKEN)) return text;
  const parts = text.split(OPEN_TOKEN);
  const nodes: ReactNode[] = [];
  parts.forEach((part, index) => {
    if (part) nodes.push(part);
    if (index < parts.length - 1) {
      nodes.push(
        <Badge key={`${keyBase}-${index}`} appearance="tint" color="warning" size="small">
          {OPEN_TOKEN}
        </Badge>,
      );
    }
  });
  return nodes;
}

function markTokens(children: ReactNode): ReactNode {
  return Children.map(children, (child, index) => {
    if (typeof child === 'string') return splitToken(child, String(index));
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children != null) {
      return cloneElement(child, undefined, markTokens(child.props.children));
    }
    return child;
  });
}

function isSafeUrl(href: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:';
  } catch {
    return false;
  }
}

function ExternalLink({ href, children }: { href: string; children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Link href={href} inline target="_blank" rel="noopener noreferrer">
      {markTokens(children)}
      <span className="sr-only"> {t('common:legal.newTab')}</span>
    </Link>
  );
}

/**
 * Schlanke Markdown-Darstellung für die Rechtstexte.
 *
 * `react-markdown` erzeugt React-Elemente, kein `dangerouslySetInnerHTML`.
 * `remark-gfm` für Tabellen, `remark-breaks` damit ein einfacher Zeilenumbruch
 * im Adressblock eine sichtbare Zeile bleibt. https- und mailto-Links öffnen
 * in einem neuen Tab.
 */
export function MarkdownDocument({ source }: { source: string }) {
  const styles = useStyles();
  const components: Components = {
    h1: ({ children }) => (
      <Text as="h1" size={700} weight="semibold" block className={styles.h1}>
        {markTokens(children)}
      </Text>
    ),
    h2: ({ children }) => (
      <Text as="h2" size={500} weight="semibold" block className={styles.h2}>
        {markTokens(children)}
      </Text>
    ),
    h3: ({ children }) => (
      <Text as="h3" size={400} weight="semibold" block className={styles.h3}>
        {markTokens(children)}
      </Text>
    ),
    p: ({ children }) => <p className="leading-relaxed">{markTokens(children)}</p>,
    strong: ({ children }) => <strong className="font-semibold">{markTokens(children)}</strong>,
    em: ({ children }) => <em>{markTokens(children)}</em>,
    ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
    li: ({ children }) => <li className="leading-relaxed">{markTokens(children)}</li>,
    a: ({ href, children }) => {
      if (!href || !isSafeUrl(href)) return <span>{markTokens(children)}</span>;
      if (href.startsWith('/') && !href.startsWith('//')) {
        return (
          <RouterLink to={href} inline>
            {markTokens(children)}
          </RouterLink>
        );
      }
      return <ExternalLink href={href}>{children}</ExternalLink>;
    },
    table: ({ children }) => (
      <div className="max-w-full overflow-x-auto">
        <table className="w-max min-w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th scope="col" className="border-border border-b px-3 py-2 text-left font-semibold">
        {markTokens(children)}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-border border-b px-3 py-2 align-top">{markTokens(children)}</td>
    ),
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
      {source}
    </ReactMarkdown>
  );
}
