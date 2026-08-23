import { cocoQLError } from "./errors.ts";

export type CocoQLTokenKind = "word" | "number" | "string" | "operator" | "dot" | "comma" | "left-bracket" | "right-bracket" | "left-paren" | "right-paren" | "newline" | "eof";

export interface CocoQLToken {
  readonly kind: CocoQLTokenKind;
  readonly value: string;
  readonly line: number;
  readonly column: number;
}

/**
 * Tokenizes Coco QL with stable source locations.
 */
export function lexCocoQL(source: string): readonly CocoQLToken[] {
  const tokens: CocoQLToken[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const push = (kind: CocoQLTokenKind, value: string, tokenLine = line, tokenColumn = column) => {
    tokens.push({ kind, value, line: tokenLine, column: tokenColumn });
  };
  const advance = () => {
    const character = source[index++];
    if (character === "\n") { line++; column = 1; } else column++;
    return character;
  };

  while (index < source.length) {
    const character = source[index]!;
    if (character === " " || character === "\t" || character === "\r") { advance(); continue; }
    if (character === "\n") { push("newline", "\n"); advance(); continue; }
    if (character === "#") { while (index < source.length && source[index] !== "\n") advance(); continue; }

    const tokenLine = line;
    const tokenColumn = column;
    if (character === ".") { push("dot", character); advance(); continue; }
    if (character === ",") { push("comma", character); advance(); continue; }
    if (character === "[") { push("left-bracket", character); advance(); continue; }
    if (character === "]") { push("right-bracket", character); advance(); continue; }
    if (character === "(") { push("left-paren", character); advance(); continue; }
    if (character === ")") { push("right-paren", character); advance(); continue; }

    if (character === '"') {
      advance();
      let value = "";
      let closed = false;
      while (index < source.length) {
        const current = advance();
        if (current === '"') { closed = true; break; }
        if (current === "\n" || current === undefined) break;
        if (current === "\\") {
          const escaped = advance();
          const escapes: Readonly<Record<string, string>> = { '"': '"', "\\": "\\", n: "\n", r: "\r", t: "\t" };
          if (!escaped || escapes[escaped] === undefined) cocoQLError({ error: "SYNTAX_ERROR", stage: "lexer", message: `Unsupported string escape at ${tokenLine}:${tokenColumn}.`, location: { line: tokenLine, column: tokenColumn, endLine: tokenLine, endColumn: tokenColumn + 1 } });
          value += escapes[escaped];
        } else value += current;
      }
      if (!closed) cocoQLError({ error: "SYNTAX_ERROR", stage: "lexer", message: `Unterminated string at ${tokenLine}:${tokenColumn}.`, location: { line: tokenLine, column: tokenColumn, endLine: tokenLine, endColumn: tokenColumn + 1 } });
      push("string", value, tokenLine, tokenColumn);
      continue;
    }

    if (/\d/.test(character) || (character === "-" && /\d/.test(source[index + 1] ?? ""))) {
      let value = "";
      if (character === "-") value += advance();
      while (/\d/.test(source[index] ?? "")) value += advance();
      if (source[index] === "." && /\d/.test(source[index + 1] ?? "")) {
        value += advance();
        while (/\d/.test(source[index] ?? "")) value += advance();
      }
      push("number", value, tokenLine, tokenColumn);
      continue;
    }

    if (/[A-Za-z_]/.test(character)) {
      let value = "";
      while (/[A-Za-z0-9_]/.test(source[index] ?? "")) value += advance();
      push("word", value.toLowerCase(), tokenLine, tokenColumn);
      continue;
    }

    const pair = source.slice(index, index + 2);
    if (["!=", ">=", "<="].includes(pair)) { push("operator", pair, tokenLine, tokenColumn); advance(); advance(); continue; }
    if (["=", ">", "<"].includes(character)) { push("operator", character, tokenLine, tokenColumn); advance(); continue; }
    cocoQLError({ error: "SYNTAX_ERROR", stage: "lexer", message: `Unexpected character '${character}' at ${line}:${column}.`, location: { line, column, endLine: line, endColumn: column + 1 } });
  }

  push("eof", "", line, column);
  return tokens;
}
