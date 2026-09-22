import React from "react";

interface MarkdownProps {
  text: string;
  searchQuery?: string;
}

interface TableBlock {
  headers: string[];
  rows: string[][];
}

const entityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] !== "#") return entityMap[entity.toLowerCase()] ?? match;

    const codePoint = entity[1].toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
  });
}

function highlightText(value: string, query: string, keyPrefix: string): React.ReactNode[] {
  const decoded = decodeEntities(value);
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [decoded];

  const parts = decoded.split(new RegExp(`(${escapeRegExp(normalizedQuery)})`, "gi"));
  return parts
    .filter((part) => part !== "")
    .map((part, index) =>
      part.toLowerCase() === normalizedQuery.toLowerCase() ? (
        <mark className="search-inline-hit" key={`${keyPrefix}-mark-${index}`}>
          {part}
        </mark>
      ) : (
        part
      )
    );
}

function renderInline(text: string, searchQuery: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const tokenPattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)\s]+\))/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text))) {
    if (match.index > cursor) {
      nodes.push(...highlightText(text.slice(cursor, match.index), searchQuery, `${keyPrefix}-${nodes.length}`));
    }

    const token = match[0];
    const key = `${keyPrefix}-token-${match.index}`;
    if (token.startsWith("`")) {
      nodes.push(<code key={key}>{decodeEntities(token.slice(1, -1))}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), searchQuery, `${key}-strong`)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1), searchQuery, `${key}-em`)}</em>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a href={linkMatch[2]} key={key} rel="noreferrer" target="_blank">
            {renderInline(linkMatch[1], searchQuery, `${key}-link`)}
          </a>
        );
      }
    }

    cursor = match.index + token.length;
  }

  if (cursor < text.length) nodes.push(...highlightText(text.slice(cursor), searchQuery, `${keyPrefix}-${nodes.length}`));
  return nodes;
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function readTable(lines: string[], startIndex: number): { block: TableBlock; nextIndex: number } | null {
  if (!lines[startIndex]?.includes("|") || !isTableSeparator(lines[startIndex + 1] ?? "")) return null;

  const headers = splitTableRow(lines[startIndex]);
  const rows: string[][] = [];
  let index = startIndex + 2;
  while (index < lines.length && lines[index].includes("|") && lines[index].trim() !== "") {
    rows.push(splitTableRow(lines[index]));
    index += 1;
  }

  return { block: { headers, rows }, nextIndex: index };
}

function isBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? "";
  return /^```/.test(line) || /^#{1,6}\s+/.test(line) || /^\s*([-*+]|\d+[.)])\s+/.test(line) || readTable(lines, index) !== null;
}

function renderMarkdown(text: string, searchQuery: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(
        <pre key={`code-${blocks.length}`}>
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const table = readTable(lines, index);
    if (table) {
      blocks.push(
        <table key={`table-${blocks.length}`}>
          <thead>
            <tr>
              {table.block.headers.map((header, headerIndex) => (
                <th key={`header-${headerIndex}`}>{renderInline(header, searchQuery, `table-${blocks.length}-h-${headerIndex}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.block.rows.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {table.block.headers.map((_, cellIndex) => (
                  <td key={`cell-${cellIndex}`}>{renderInline(row[cellIndex] ?? "", searchQuery, `table-${blocks.length}-${rowIndex}-${cellIndex}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      index = table.nextIndex;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const Tag = `h${headingMatch[1].length}` as keyof JSX.IntrinsicElements;
      blocks.push(<Tag key={`heading-${blocks.length}`}>{renderInline(headingMatch[2], searchQuery, `heading-${blocks.length}`)}</Tag>);
      index += 1;
      continue;
    }

    const listMatch = line.match(/^\s*([-*+]|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const itemMatch = lines[index].match(/^\s*([-*+]|\d+[.)])\s+(.+)$/);
        if (!itemMatch || /\d/.test(itemMatch[1]) !== ordered) break;
        items.push(itemMatch[2]);
        index += 1;
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={`list-${blocks.length}`}>
          {items.map((item, itemIndex) => (
            <li key={`item-${itemIndex}`}>{renderInline(item, searchQuery, `list-${blocks.length}-${itemIndex}`)}</li>
          ))}
        </ListTag>
      );
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() !== "" && !isBlockStart(lines, index)) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`paragraph-${blocks.length}`}>{renderInline(paragraphLines.join(" "), searchQuery, `paragraph-${blocks.length}`)}</p>);
  }

  return blocks;
}

function MarkdownImpl({ text, searchQuery = "" }: MarkdownProps) {
  return <div className="markdown-body">{renderMarkdown(text, searchQuery)}</div>;
}

export const Markdown = React.memo(MarkdownImpl);
