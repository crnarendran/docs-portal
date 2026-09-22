import React from 'react';
import Link from 'next/link';
import { Mermaid } from './Mermaid';
import { rowMatchesStoryId, storyRowId } from '@/lib/storyLink';

// Flattens a ReactMarkdown children tree to its plain text (bold, links,
// etc. and all), so the `tr` component below can test cell text against the
// ?story= id without caring how it was formatted in the source markdown.
function reactChildrenToText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(reactChildrenToText).join('');
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return reactChildrenToText(props.children);
  }
  return '';
}

// The id column is conventionally the row's FIRST cell in these specs (see
// docs-portal-defects.md, active_locks.md: "| **DP-2** | Story | Rationale |
// ASP | Dep | Status |"). Matching only that cell — not the whole row —
// avoids a false match against a "Dep" column or prose elsewhere in the row
// that merely references another story's id.
function firstCellText(rowChildren: React.ReactNode): string {
  const cells = Array.isArray(rowChildren) ? rowChildren : [rowChildren];
  const firstCell = cells.find((c) => React.isValidElement(c));
  return firstCell ? reactChildrenToText(firstCell) : reactChildrenToText(rowChildren);
}

// Resolves a relative markdown link (e.g. "../adr/foo.md") against the
// directory of the doc that contains it, using the same slug convention
// syncDocs.ts uses (posix-style, no leading/trailing slash).
function resolveRelativeSlug(currentSlug: string, relativeHref: string): string {
  const baseParts = currentSlug.includes('/')
    ? currentSlug.slice(0, currentSlug.lastIndexOf('/')).split('/')
    : [];
  const stack = [...baseParts];

  for (const part of relativeHref.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }

  return stack.join('/').replace(/\.mdx?$/, '');
}

// next-mdx-remote/ReactMarkdown components. Built per-render (not a static
// object) because the custom link handler needs to know which doc/project/env
// it's rendering inside, so relative doc-to-doc links can be rewritten to the
// portal's actual route and keep the current ?env= instead of losing it on a
// plain <a> navigation.
export function createMdxComponents({
  project,
  slug,
  env,
  storyId,
}: {
  project: string;
  slug: string;
  env: string;
  // DP-2: the ?story=<id> being deep-linked to, if any. Tags the matching
  // table row with a stable id so the viewer can scroll to it once content
  // has rendered; see src/lib/storyLink.ts for the matching rule.
  storyId?: string;
}) {
  return {
    tr: (props: any) => {
      if (!storyId) return <tr {...props} />;
      if (!rowMatchesStoryId(firstCellText(props.children), storyId)) return <tr {...props} />;
      return <tr {...props} id={storyRowId(storyId)} />;
    },
    code: (props: any) => {
      const { className, children } = props;
      const isMermaid = className && className.includes('language-mermaid');

      if (isMermaid && typeof children === 'string') {
        return <Mermaid chart={children} />;
      }

      return <code {...props} />;
    },
    pre: (props: any) => {
      const { children, className: preClassName } = props;
      let isMermaid = false;
      let codeContent = '';

      if (typeof preClassName === 'string' && preClassName.includes('language-mermaid')) {
        isMermaid = true;
      }

      const childArr = Array.isArray(children) ? children : [children];
      for (const child of childArr) {
        if (React.isValidElement(child)) {
          const childClassName = (child.props as any).className || '';
          if (typeof childClassName === 'string' && childClassName.includes('language-mermaid')) {
            isMermaid = true;
            codeContent = (child.props as any).children;
            break;
          }

          // Sniff content if class is missing
          const text = (child.props as any).children;
          if (typeof text === 'string' && (text.trim().startsWith('graph ') || text.trim().startsWith('sequenceDiagram'))) {
            isMermaid = true;
            codeContent = text;
            break;
          }
        }
      }

      // If we only found it on the pre tag, we need to extract the text from children
      if (isMermaid && !codeContent) {
        for (const child of childArr) {
          if (React.isValidElement(child)) {
            codeContent = (child.props as any).children;
            break;
          } else if (typeof child === 'string') {
            codeContent = child;
            break;
          }
        }
      }

      if (isMermaid && typeof codeContent === 'string') {
        return <Mermaid chart={codeContent} />;
      }

      return <pre {...props} />;
    },
    a: ({ href, children, ...props }: any) => {
      if (!href) return <a {...props}>{children}</a>;

      const isExternal = /^([a-z][a-z0-9+.-]*:)?\/\//i.test(href) || href.startsWith('mailto:');
      if (isExternal || href.startsWith('#')) {
        return (
          <a href={href} target={href.startsWith('#') ? undefined : '_blank'} rel="noopener noreferrer" {...props}>
            {children}
          </a>
        );
      }

      // Relative link to another doc in the tree (e.g. "2026-07-20-foo.md" or
      // "../ops/infrastructure-map.md") — rewrite to the real portal route and
      // carry the current env forward instead of losing it on a plain <a>.
      const [pathPart, hash] = href.split('#');
      const targetSlug = pathPart ? resolveRelativeSlug(slug, pathPart) : slug;
      const targetHref = `/${project}/${targetSlug}?env=${env}${hash ? `#${hash}` : ''}`;

      return (
        <Link href={targetHref} {...props}>
          {children}
        </Link>
      );
    },
  };
}
