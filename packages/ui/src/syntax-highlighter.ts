import { jsx, type CocoNode } from "@cocoframe/jsx";

export type SyntaxLanguage = "tsx" | "typescript" | "javascript" | "json" | "css" | "html" | "bash" | "cocoql" | "text";

export type SyntaxTokenKind = "plain" | "comment" | "keyword" | "literal" | "string" | "number" | "operator" | "tag" | "attribute" | "property" | "variable";

export interface SyntaxToken {
  readonly kind: SyntaxTokenKind;
  readonly value: string;
}

export interface SyntaxHighlighterProps {
  readonly code: string;
  readonly language?: SyntaxLanguage;
  readonly label?: string;
  readonly showLineNumbers?: boolean;
  readonly class?: string;
}

const scriptKeywords = new Set([
  "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "debugger", "declare", "default", "delete", "do", "else", "enum", "export", "extends", "finally", "for", "from", "function", "get", "if", "implements", "import", "in", "instanceof", "interface", "keyof", "let", "namespace", "new", "of", "private", "protected", "public", "readonly", "return", "satisfies", "set", "static", "super", "switch", "throw", "try", "type", "typeof", "var", "void", "while", "with", "yield",
]);
const bashKeywords = new Set(["case", "do", "done", "elif", "else", "esac", "fi", "for", "function", "if", "in", "select", "then", "time", "until", "while"]);
const cocoqlKeywords = new Set(["affected", "after", "as", "avg", "before", "confirm", "contains", "count", "create", "days", "delete", "ends_with", "filter", "from", "group", "in", "last", "last_month", "last_week", "last_year", "max", "min", "next", "not", "preview", "select", "skip", "sort", "starts_with", "sum", "take", "this_month", "this_week", "this_year", "today", "update", "with", "yesterday"]);
const literals = new Set(["false", "Infinity", "NaN", "null", "true", "undefined"]);

export function tokenizeSyntax(code: string, language: SyntaxLanguage = "tsx"): readonly SyntaxToken[] {
  if (language === "text" || code.length === 0) return [{ kind: "plain", value: code }];
  if (language === "html") return tokenizeMarkup(code);
  if (language === "css") return tokenizeCss(code);
  return tokenizeScript(code, language);
}

export function SyntaxHighlighter({ code, language = "tsx", label, showLineNumbers = false, class: className }: SyntaxHighlighterProps): CocoNode {
  const tokens = tokenizeSyntax(code, language);
  const content = showLineNumbers
    ? tokensToLines(tokens).map((line, index) => jsx("span", { class: "coco-syntax__line", "data-line": index + 1, children: renderTokens(line) }))
    : renderTokens(tokens);
  return jsx("pre", {
    class: classes("coco-syntax", showLineNumbers ? "coco-syntax--numbered" : undefined, className),
    "data-language": language,
    tabindex: 0,
    "aria-label": label ?? `${language} code example`,
    children: jsx("code", { class: `language-${language}`, children: content }),
  });
}

function tokenizeScript(code: string, language: Exclude<SyntaxLanguage, "html" | "css" | "text">): readonly SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  const keywords = language === "bash" ? bashKeywords : language === "cocoql" ? cocoqlKeywords : scriptKeywords;
  let index = 0;
  let expectTag = false;
  while (index < code.length) {
    const start = index;
    const char = code[index]!;
    const next = code[index + 1];

    if (/\s/.test(char)) {
      while (index < code.length && /\s/.test(code[index]!)) index++;
      push(tokens, "plain", code.slice(start, index));
      continue;
    }
    if ((char === "/" && next === "/") || ((language === "bash" || language === "cocoql") && char === "#")) {
      index += language === "bash" || language === "cocoql" ? 1 : 2;
      while (index < code.length && code[index] !== "\n") index++;
      push(tokens, "comment", code.slice(start, index));
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index < code.length && !(code[index] === "*" && code[index + 1] === "/")) index++;
      index = Math.min(code.length, index + 2);
      push(tokens, "comment", code.slice(start, index));
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      index = consumeQuoted(code, index, char);
      push(tokens, "string", code.slice(start, index));
      continue;
    }
    if (language === "bash" && char === "$") {
      index++;
      if (code[index] === "{") {
        index++;
        while (index < code.length && code[index] !== "}") index++;
        if (code[index] === "}") index++;
      } else {
        while (index < code.length && /[\w@#?$!*-]/.test(code[index]!)) index++;
      }
      push(tokens, "variable", code.slice(start, index));
      continue;
    }
    if (/\d/.test(char) || (char === "." && next && /\d/.test(next))) {
      index++;
      while (index < code.length && /[\w._]/.test(code[index]!)) index++;
      push(tokens, "number", code.slice(start, index));
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      index++;
      while (index < code.length && /[\w$-]/.test(code[index]!)) index++;
      const value = code.slice(start, index);
      const kind: SyntaxTokenKind = expectTag ? "tag" : keywords.has(value) ? "keyword" : literals.has(value) ? "literal" : "plain";
      push(tokens, kind, value);
      expectTag = false;
      continue;
    }
    if ((language === "tsx" || language === "javascript" || language === "typescript") && char === "<" && /[\/>A-Za-z]/.test(next ?? "")) {
      index++;
      if (code[index] === "/") index++;
      push(tokens, "operator", code.slice(start, index));
      expectTag = true;
      continue;
    }
    if (/[{}()[\];,.?:+*=!&|%<>\/-]/.test(char)) {
      index++;
      while (index < code.length && /[=>&|.?]/.test(code[index]!) && index - start < 3) index++;
      push(tokens, "operator", code.slice(start, index));
      continue;
    }
    index++;
    push(tokens, "plain", char);
  }
  return tokens;
}

function tokenizeMarkup(code: string): readonly SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let index = 0;
  let inTag = false;
  let expectTag = false;
  while (index < code.length) {
    const start = index;
    const char = code[index]!;
    if (code.startsWith("<!--", index)) {
      const end = code.indexOf("-->", index + 4);
      index = end === -1 ? code.length : end + 3;
      push(tokens, "comment", code.slice(start, index));
    } else if (char === "<") {
      index++;
      if (code[index] === "/" || code[index] === "!") index++;
      push(tokens, "operator", code.slice(start, index));
      inTag = true;
      expectTag = true;
    } else if (inTag && char === ">") {
      index++;
      push(tokens, "operator", char);
      inTag = false;
    } else if (inTag && char === "/" && code[index + 1] === ">") {
      index += 2;
      push(tokens, "operator", "/>");
      inTag = false;
    } else if (char === '"' || char === "'") {
      index = consumeQuoted(code, index, char);
      push(tokens, "string", code.slice(start, index));
    } else if (/[A-Za-z_:]/.test(char)) {
      index++;
      while (index < code.length && /[\w:.-]/.test(code[index]!)) index++;
      push(tokens, expectTag ? "tag" : inTag ? "attribute" : "plain", code.slice(start, index));
      expectTag = false;
    } else {
      index++;
      while (index < code.length && !/[<>'"A-Za-z_:]/.test(code[index]!)) index++;
      push(tokens, inTag && char === "=" ? "operator" : "plain", code.slice(start, index));
    }
  }
  return tokens;
}

function tokenizeCss(code: string): readonly SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let index = 0;
  let inBlock = false;
  while (index < code.length) {
    const start = index;
    const char = code[index]!;
    if (char === "/" && code[index + 1] === "*") {
      index += 2;
      while (index < code.length && !(code[index] === "*" && code[index + 1] === "/")) index++;
      index = Math.min(code.length, index + 2);
      push(tokens, "comment", code.slice(start, index));
    } else if (char === '"' || char === "'") {
      index = consumeQuoted(code, index, char);
      push(tokens, "string", code.slice(start, index));
    } else if (char === "@") {
      index++;
      while (index < code.length && /[\w-]/.test(code[index]!)) index++;
      push(tokens, "keyword", code.slice(start, index));
    } else if (char === "#" && /[\da-fA-F]/.test(code[index + 1] ?? "")) {
      index++;
      while (index < code.length && /[\da-fA-F]/.test(code[index]!)) index++;
      push(tokens, "number", code.slice(start, index));
    } else if (/\d/.test(char)) {
      index++;
      while (index < code.length && /[\w.%]/.test(code[index]!)) index++;
      push(tokens, "number", code.slice(start, index));
    } else if (/[-_A-Za-z]/.test(char)) {
      index++;
      while (index < code.length && /[\w-]/.test(code[index]!)) index++;
      let lookahead = index;
      while (lookahead < code.length && /\s/.test(code[lookahead]!)) lookahead++;
      push(tokens, inBlock && code[lookahead] === ":" ? "property" : "plain", code.slice(start, index));
    } else {
      index++;
      if (char === "{") inBlock = true;
      if (char === "}") inBlock = false;
      push(tokens, /[{}:;,()]/.test(char) ? "operator" : "plain", char);
    }
  }
  return tokens;
}

function consumeQuoted(code: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < code.length) {
    if (code[index] === "\\") index += 2;
    else if (code[index] === quote) return index + 1;
    else index++;
  }
  return code.length;
}

function tokensToLines(tokens: readonly SyntaxToken[]): readonly (readonly SyntaxToken[])[] {
  const lines: SyntaxToken[][] = [[]];
  for (const token of tokens) {
    const parts = token.value.split("\n");
    parts.forEach((part, index) => {
      if (part) lines[lines.length - 1]!.push({ ...token, value: part });
      if (index < parts.length - 1) lines.push([]);
    });
  }
  return lines;
}

function renderTokens(tokens: readonly SyntaxToken[]): CocoNode {
  return tokens.map((token) => token.kind === "plain" ? token.value : jsx("span", { class: `coco-token coco-token--${token.kind}`, children: token.value }));
}

function push(tokens: SyntaxToken[], kind: SyntaxTokenKind, value: string): void {
  if (!value) return;
  const previous = tokens[tokens.length - 1];
  if (previous?.kind === kind) tokens[tokens.length - 1] = { kind, value: previous.value + value };
  else tokens.push({ kind, value });
}

function classes(...values: readonly (string | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}
