export interface Frontmatter {
  data: Record<string, string>;
  body: string;
}

/** A small YAML subset: flat keys, folded `>` / literal `|` blocks, and ` #` comments. */
export function parseFrontmatter(markdown: string): Frontmatter {
  const text = markdown.replace(/^\uFEFF/, "");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return { data: {}, body: text };
  const raw = match[1] ?? "";
  const body = text.slice(match[0].length);
  return { data: parseFlatYaml(raw), body };
}

export function toolNames(allowedToolsField: string | undefined): string[] {
  if (!allowedToolsField) return [];
  const names: string[] = [];
  for (const part of allowedToolsField.split(",")) {
    const token = part.trim();
    if (!token) continue;
    const base = token.replace(/\(.*$/, "");
    if (base && !names.includes(base)) names.push(base);
  }
  return names;
}

function parseFlatYaml(raw: string): Record<string, string> {
  const lines = raw.split(/\r?\n/);
  const data: Record<string, string> = {};
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      index += 1;
      continue;
    }
    const keyValue = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!keyValue) {
      index += 1;
      continue;
    }
    const key = keyValue[1] ?? "";
    const value = keyValue[2] ?? "";
    if (value === ">" || value === ">-" || value === "|" || value === "|-") {
      const folded = value.startsWith(">");
      const collected: string[] = [];
      index += 1;
      while (index < lines.length) {
        const next = lines[index] ?? "";
        if (next.trim() === "") {
          collected.push("");
          index += 1;
          continue;
        }
        if (!/^\s/.test(next)) break;
        collected.push(next.trim());
        index += 1;
      }
      data[key] = folded ? collected.join(" ").replace(/\s+/g, " ").trim() : collected.join("\n").trim();
      continue;
    }
    data[key] = stripInlineComment(value);
    index += 1;
  }
  return data;
}

function stripInlineComment(value: string): string {
  const hash = value.indexOf(" #");
  return (hash === -1 ? value : value.slice(0, hash)).trim();
}
