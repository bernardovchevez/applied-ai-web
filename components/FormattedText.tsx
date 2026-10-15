import { Fragment } from "react";

import type { SourceCitation } from "@/lib/types";

type BodyBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

/** Minimal inline formatting: `**bold**` → <strong> */
function InlineFormatted({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

function parseBodyBlocks(text: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  const lines = text.split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    const joined = paragraph.join("\n").trim();
    if (joined) blocks.push({ type: "paragraph", text: joined });
    paragraph = [];
  };

  const flushList = () => {
    if (list.length) blocks.push({ type: "list", items: [...list] });
    list = [];
  };

  for (const line of lines) {
    const bullet = line.match(/^[\*-]\s+(.+)/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1].trim());
      continue;
    }

    if (line.trim() === "") {
      flushList();
      flushParagraph();
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushList();
  flushParagraph();
  return blocks;
}

function AnswerBody({ text }: { text: string }) {
  const blocks = parseBodyBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ul key={index} className="answer-list">
              {block.items.map((item) => (
                <li key={item}>
                  <InlineFormatted text={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="answer-paragraph">
            <InlineFormatted text={block.text} />
          </p>
        );
      })}
    </>
  );
}

/** Answer body + optional Sources: filename bullet list enriched with metadata badges */
export function FormattedText({
  text,
  sources,
}: {
  text: string;
  sources?: SourceCitation[];
}) {
  const marker = "\n\nSources:\n";
  const split = text.indexOf(marker);
  const body = split === -1 ? text : text.slice(0, split);
  const parsedLines =
    split === -1
      ? []
      : text
          .slice(split + marker.length)
          .split("\n")
          .map((line) => line.replace(/^-\s*/, "").trim())
          .filter(Boolean);

  const sourceMap = new Map<string, SourceCitation>();
  for (const s of sources ?? []) {
    if (s.file_name && !sourceMap.has(s.file_name)) {
      sourceMap.set(s.file_name, s);
    }
  }

  const displayFiles =
    parsedLines.length > 0
      ? parsedLines
      : Array.from(sourceMap.keys());

  return (
    <>
      <AnswerBody text={body} />
      {displayFiles.length > 0 ? (
        <>
          <p className="answer-sources-label">Sources</p>
          <ul className="answer-sources">
            {displayFiles.map((file) => {
              const meta = sourceMap.get(file);
              return (
                <li key={file}>
                  <code>{file}</code>
                  {meta?.doc_type ? <span className="meta">{meta.doc_type}</span> : null}
                  {meta?.rights_tier ? <span className="meta">{meta.rights_tier}</span> : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </>
  );
}
