import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface MarkdownProps {
  text: string;
  searchQuery?: string;
}

interface HastTextNode {
  type: "text";
  value: string;
}

interface HastElementNode {
  type: "element";
  tagName: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

type HastNode = HastTextNode | HastElementNode | { type: string; children?: HastNode[] };

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightTextNode(value: string, query: string): HastNode[] {
  const parts = value.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return parts
    .filter((part) => part !== "")
    .map((part) =>
      part.toLowerCase() === query.toLowerCase()
        ? { type: "element", tagName: "mark", properties: { className: ["search-inline-hit"] }, children: [{ type: "text", value: part }] }
        : { type: "text", value: part }
    );
}

function rehypeInlineSearchHighlight(options: { query: string }) {
  const query = options.query.trim();
  return function transform(tree: HastNode) {
    if (!query) return;

    const visit = (node: HastNode) => {
      if (!("children" in node) || !node.children) return;
      const nextChildren: HastNode[] = [];
      for (const child of node.children) {
        if (child.type === "text" && "value" in child) {
          nextChildren.push(...highlightTextNode(child.value, query));
        } else {
          visit(child);
          nextChildren.push(child);
        }
      }
      node.children = nextChildren;
    };

    visit(tree);
  };
}

function MarkdownImpl({ text, searchQuery = "" }: MarkdownProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, [rehypeInlineSearchHighlight, { query: searchQuery }]]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = React.memo(MarkdownImpl);
