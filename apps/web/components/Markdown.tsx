"use client";

import { useState, type ReactNode } from "react";

type Inline =
  | { type: "text"; content: string }
  | { type: "bold"; content: string }
  | { type: "italic"; content: string }
  | { type: "code"; content: string }
  | { type: "link"; href: string; content: string };

type Block =
  | { type: "p"; inlines: Inline[] }
  | { type: "h1"; content: string }
  | { type: "h2"; content: string }
  | { type: "h3"; content: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; lang: string; content: string }
  | { type: "quote"; content: string }
  | { type: "hr" };

function parseInline(text: string): Inline[] {
  const inlines: Inline[] = [];
  let i = 0;
  while (i < text.length) {
    const ch0 = text[i];
    if (ch0 === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i) {
        inlines.push({ type: "code", content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (ch0 === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end > i + 1) {
        inlines.push({ type: "bold", content: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (ch0 === "*" || ch0 === "_") {
      const end = text.indexOf(ch0, i + 1);
      if (end > i) {
        inlines.push({ type: "italic", content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (ch0 === "[") {
      const close = text.indexOf("]", i + 1);
      if (close > i && text[close + 1] === "(") {
        const end = text.indexOf(")", close + 2);
        if (end > close) {
          inlines.push({
            type: "link",
            href: text.slice(close + 2, end),
            content: text.slice(i + 1, close),
          });
          i = end + 1;
          continue;
        }
      }
    }
    let j = i;
    while (j < text.length) {
      const c = text[j];
      if (c === "`" || c === "*" || c === "_" || c === "[") break;
      j++;
    }
    inlines.push({ type: "text", content: text.slice(i, j) });
    i = j;
  }
  return inlines;
}

function parseMarkdown(src: string): Block[] {
  const lines = src.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  const lineAt = (n: number): string => lines[n] ?? "";

  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.trim() === "---") {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (/^```/.test(line.trim())) {
      const lang = line.trim().slice(3).split(/\s/)[0] ?? "";
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lineAt(i).trim())) {
        code.push(lineAt(i));
        i++;
      }
      i++;
      blocks.push({ type: "code", lang, content: code.join("\n") });
      continue;
    }

    if (/^###\s/.test(line)) {
      blocks.push({ type: "h3", content: line.replace(/^###\s/, "") });
      i++;
      continue;
    }
    if (/^##\s/.test(line)) {
      blocks.push({ type: "h2", content: line.replace(/^##\s/, "") });
      i++;
      continue;
    }
    if (/^#\s/.test(line)) {
      blocks.push({ type: "h1", content: line.replace(/^#\s/, "") });
      i++;
      continue;
    }

    if (/^>\s/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s/.test(lineAt(i))) {
        quote.push(lineAt(i).replace(/^>\s/, ""));
        i++;
      }
      blocks.push({ type: "quote", content: quote.join("\n") });
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lineAt(i))) {
        items.push(lineAt(i).replace(/^[-*]\s/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lineAt(i))) {
        items.push(lineAt(i).replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lineAt(i).trim() !== "" &&
      !/^#{1,3}\s/.test(lineAt(i)) &&
      !/^[-*]\s/.test(lineAt(i)) &&
      !/^\d+\.\s/.test(lineAt(i)) &&
      !/^```/.test(lineAt(i).trim()) &&
      !/^>\s/.test(lineAt(i))
    ) {
      para.push(lineAt(i));
      i++;
    }
    if (para.length) {
      blocks.push({ type: "p", inlines: parseInline(para.join(" ")) });
    }
  }

  return blocks;
}

function CodeBlock({ lang, content }: { lang: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div
      style={{
        margin: "10px 0",
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--bg-1)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 12px",
          background: "var(--bg-3)",
          fontSize: "11px",
          color: "var(--text-mute)",
          fontFamily: "var(--mono)",
        }}
      >
        <span>{lang || "code"}</span>
        <button
          onClick={copy}
          style={{
            color: copied ? "var(--ok)" : "var(--accent)",
            fontSize: "11px",
            padding: "2px 8px",
            borderRadius: "4px",
            background: "rgba(0,229,255,0.1)",
          }}
        >
          {copied ? "✓ Copié" : "Copier"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: "12px",
          overflowX: "auto",
          fontFamily: "var(--mono)",
          fontSize: "13px",
          lineHeight: 1.5,
          color: "var(--text)",
        }}
      >
        <code>{content}</code>
      </pre>
    </div>
  );
}

function renderInline(inl: Inline, key: number): ReactNode {
  switch (inl.type) {
    case "bold":
      return <strong key={key}>{inl.content}</strong>;
    case "italic":
      return <em key={key}>{inl.content}</em>;
    case "code":
      return (
        <code
          key={key}
          style={{
            background: "var(--bg-3)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontFamily: "var(--mono)",
            fontSize: "0.9em",
            color: "var(--accent)",
          }}
        >
          {inl.content}
        </code>
      );
    case "link":
      return (
        <a key={key} href={inl.href} target="_blank" rel="noreferrer">
          {inl.content}
        </a>
      );
    default:
      return <span key={key}>{inl.content}</span>;
  }
}

export default function Markdown({ content }: { content: string }) {
  const blocks = parseMarkdown(content);
  return (
    <div style={{ lineHeight: 1.7 }}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1":
            return (
              <h1 key={i} style={{ fontSize: "20px", fontWeight: 700, margin: "16px 0 8px", color: "var(--accent)" }}>
                {b.content}
              </h1>
            );
          case "h2":
            return (
              <h2 key={i} style={{ fontSize: "17px", fontWeight: 700, margin: "14px 0 6px", color: "var(--accent)" }}>
                {b.content}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} style={{ fontSize: "15px", fontWeight: 600, margin: "12px 0 4px", color: "var(--accent-2)" }}>
                {b.content}
              </h3>
            );
          case "ul":
            return (
              <ul key={i} style={{ margin: "8px 0", paddingLeft: "20px" }}>
                {b.items.map((it, j) => (
                  <li key={j} style={{ marginBottom: "4px" }}>
                    {parseInline(it).map(renderInline)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} style={{ margin: "8px 0", paddingLeft: "20px" }}>
                {b.items.map((it, j) => (
                  <li key={j} style={{ marginBottom: "4px" }}>
                    {parseInline(it).map(renderInline)}
                  </li>
                ))}
              </ol>
            );
          case "code":
            return <CodeBlock key={i} lang={b.lang} content={b.content} />;
          case "quote":
            return (
              <blockquote
                key={i}
                style={{
                  margin: "8px 0",
                  padding: "8px 14px",
                  borderLeft: "3px solid var(--accent)",
                  background: "rgba(0,229,255,0.05)",
                  borderRadius: "0 8px 8px 0",
                  color: "var(--text-dim)",
                }}
              >
                {b.content}
              </blockquote>
            );
          case "hr":
            return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "16px 0" }} />;
          default:
            return <p key={i} style={{ margin: "8px 0" }}>{b.inlines.map(renderInline)}</p>;
        }
      })}
    </div>
  );
}
