import fs from "node:fs/promises";
import path from "node:path";
import { AdapterError } from "./errors.js";
import { parseFrontmatter, toolNames } from "./frontmatter.js";
import type { PortalCliContract, PortalSkill, SkillFile } from "./types.js";

export async function readCoreText(coreRoot: string, relativePath: string): Promise<string> {
  const absolute = await resolveInsideCore(coreRoot, relativePath);
  try {
    return await fs.readFile(absolute, "utf8");
  } catch (error) {
    if (isNotFound(error)) {
      throw new AdapterError(`Missing core file: ${relativePath}`, 500);
    }
    throw error;
  }
}

export async function coreFileExists(coreRoot: string, relativePath: string): Promise<boolean> {
  try {
    const absolute = await resolveInsideCore(coreRoot, relativePath);
    const stat = await fs.stat(absolute);
    return stat.isFile();
  } catch (error) {
    if (error instanceof AdapterError || isNotFound(error)) return false;
    throw error;
  }
}

export async function readSkillFile(coreRoot: string, relativePath: string): Promise<SkillFile> {
  const text = await readCoreText(coreRoot, relativePath);
  const parsed = parseFrontmatter(text);
  const enabledRaw = parsed.data.enabled;
  let enabled: boolean | null = null;
  if (enabledRaw === "true") enabled = true;
  if (enabledRaw === "false") enabled = false;
  return {
    relativePath,
    name: parsed.data.name ?? null,
    description: parsed.data.description ?? "",
    allowedTools: toolNames(parsed.data["allowed-tools"]),
    enabled,
    text,
    body: parsed.body,
  };
}

export async function listPortalSkills(coreRoot: string): Promise<PortalSkill[]> {
  const skillsDir = path.join(coreRoot, ".agents", "skills");
  let entries;
  try {
    entries = await fs.readdir(skillsDir, { withFileTypes: true });
  } catch (error) {
    if (isNotFound(error)) {
      throw new AdapterError("The core checkout has no .agents/skills directory.", 500);
    }
    throw error;
  }
  const portals: PortalSkill[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const relativePath = `.agents/skills/${entry.name}/SKILL.md`;
    if (!(await coreFileExists(coreRoot, relativePath))) continue;
    const skill = await readSkillFile(coreRoot, relativePath);
    portals.push({
      directoryName: entry.name,
      skillPath: relativePath,
      name: skill.name,
      enabled: skill.enabled !== false,
      personalUseOnly: /personal use only/i.test(skill.text),
      documentsSearch: skill.text.includes("cli.ts search"),
      documentsDetail: skill.text.includes("cli.ts detail"),
      documentsFormatJson: skill.text.includes("--format json"),
    });
  }
  portals.sort((a, b) => a.directoryName.localeCompare(b.directoryName));
  return portals;
}

/** Reads portal search-command source to check the JSON shape. Does not execute the CLI. */
export async function readPortalCliContracts(coreRoot: string): Promise<PortalCliContract[]> {
  const portals = await listPortalSkills(coreRoot);
  const contracts: PortalCliContract[] = [];
  for (const portal of portals) {
    const searchSourcePath = `.agents/skills/${portal.directoryName}/cli/src/commands/search.ts`;
    let source = "";
    let searchSourceFound = false;
    if (await coreFileExists(coreRoot, searchSourcePath)) {
      source = await readCoreText(coreRoot, searchSourcePath);
      searchSourceFound = true;
    }
    const emitsResultsArray = /results/.test(source) && /format === ["']json["']|JSON\.stringify/.test(source);
    contracts.push({
      directoryName: portal.directoryName,
      searchSourcePath,
      searchSourceFound,
      emitsResultsArray,
    });
  }
  return contracts;
}

async function resolveInsideCore(coreRoot: string, relativePath: string): Promise<string> {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new AdapterError("Refusing to read outside CORE_ROOT.");
  }
  const root = path.resolve(coreRoot);
  const absolute = path.resolve(root, relativePath);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    throw new AdapterError("Refusing to read outside CORE_ROOT.");
  }
  let rootReal = root;
  try {
    rootReal = await fs.realpath(root);
  } catch (error) {
    if (isNotFound(error)) {
      throw new AdapterError(`CORE_ROOT does not exist: ${root}`, 500);
    }
    throw error;
  }
  try {
    const real = await fs.realpath(absolute);
    if (real !== rootReal && !real.startsWith(rootReal + path.sep)) {
      throw new AdapterError("Refusing to read outside CORE_ROOT.");
    }
    return real;
  } catch (error) {
    if (isNotFound(error)) return absolute;
    if (error instanceof AdapterError) throw error;
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
}
