import { AdapterError } from "./errors.js";
import { readCoreText } from "./skills.js";
import type {
  ModelClient,
  ModelRequest,
  ModelResponse,
  ShellRequest,
  ShellResult,
  ShellRunner,
  ToolCall,
  ToolTraceEntry,
} from "./types.js";
import { MemoryWorkspace } from "./workspace.js";

/**
 * Stand-in model. It receives the skill markdown and returns tool calls.
 * It does not interpret the workflow and it does not call an API.
 */
export class StubModel implements ModelClient {
  async complete(request: ModelRequest): Promise<ModelResponse> {
    if (request.documents.length === 0) {
      throw new AdapterError("The model stub was given no skill text.", 500);
    }
    const toolCalls: ToolCall[] = request.documents.map((document) => ({
      tool: "read_file",
      input: { path: document.relativePath },
    }));
    if (request.kind === "scrape") {
      for (const portal of request.portals) {
        if (!portal.enabled) continue;
        toolCalls.push({
          tool: "portal_cli",
          input: {
            portal: portal.directoryName,
            argv: ["search", "--format", "json"],
          },
        });
      }
    }
    if (request.kind === "apply" && request.user.postingText) {
      toolCalls.push({
        tool: "write_file",
        input: { path: "scratch/posting.txt", content: request.user.postingText },
      });
    }
    if (request.kind === "apply" && request.user.postingUrl) {
      toolCalls.push({
        tool: "web_fetch",
        input: { url: request.user.postingUrl },
      });
    }
    if (request.kind === "apply") {
      toolCalls.push({ tool: "compile_latex", input: {} });
    }
    return {
      assistantText:
        "Stub model: no API was called. Skill files were passed through for a real model to follow. This stub does not rewrite that workflow.",
      toolCalls,
    };
  }
}

/** Stand-in shell. `allowSpawn: true` is still refused. Nothing is executed. */
export class StubShell implements ShellRunner {
  readonly calls: ShellRequest[] = [];

  async run(request: ShellRequest): Promise<ShellResult> {
    this.calls.push(request);
    return {
      ok: true,
      executed: false,
      stubbed: true,
      output: "Not executed. The stub shell does not spawn processes or open the network.",
    };
  }
}

export async function executeToolLoop(options: {
  response: ModelResponse;
  coreRoot: string;
  shell: ShellRunner;
  workspace: MemoryWorkspace;
}): Promise<ToolTraceEntry[]> {
  const trace: ToolTraceEntry[] = [];
  for (const call of options.response.toolCalls) {
    trace.push(await dispatchTool(call, options));
  }
  return trace;
}

async function dispatchTool(
  call: ToolCall,
  options: { coreRoot: string; shell: ShellRunner; workspace: MemoryWorkspace },
): Promise<ToolTraceEntry> {
  try {
    if (call.tool === "read_file") {
      const relativePath = stringField(call.input.path);
      const text = await readCoreText(options.coreRoot, relativePath);
      return {
        tool: call.tool,
        ok: true,
        executed: true,
        stubbed: false,
        detail: `Read ${relativePath} (${Buffer.byteLength(text)} bytes) from CORE_ROOT.`,
      };
    }
    if (call.tool === "write_file") {
      const relativePath = stringField(call.input.path);
      const content = stringField(call.input.content);
      const saved = options.workspace.write(relativePath, content);
      return {
        tool: call.tool,
        ok: true,
        executed: true,
        stubbed: false,
        detail: `Saved ${saved} (${Buffer.byteLength(content)} bytes) in the scratch workspace.`,
      };
    }
    if (
      call.tool === "portal_cli" ||
      call.tool === "bash" ||
      call.tool === "compile_latex" ||
      call.tool === "web_fetch" ||
      call.tool === "web_search"
    ) {
      const argv = stringArray(call.input.argv);
      const result = await options.shell.run({
        kind: shellKind(call.tool),
        argv,
        allowSpawn: false,
      });
      return {
        tool: call.tool,
        ok: result.ok,
        executed: result.executed,
        stubbed: result.stubbed,
        detail: describeStubbed(call, result.output),
      };
    }
    return {
      tool: call.tool,
      ok: false,
      executed: false,
      stubbed: true,
      detail: "Unknown tool.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      tool: call.tool,
      ok: false,
      executed: false,
      stubbed: true,
      detail: message,
    };
  }
}

function describeStubbed(call: ToolCall, output: string): string {
  if (call.tool === "portal_cli") {
    const portal = typeof call.input.portal === "string" ? call.input.portal : "portal";
    return `Did not run search --format json for ${portal}. ${output}`;
  }
  if (call.tool === "web_fetch" || call.tool === "web_search") {
    return `Did not open a network connection. ${output}`;
  }
  if (call.tool === "compile_latex") {
    return `Did not compile LaTeX. ${output}`;
  }
  return output;
}

function shellKind(tool: ToolCall["tool"]): ShellRequest["kind"] {
  if (tool === "portal_cli") return "portal_cli";
  if (tool === "compile_latex") return "latex";
  if (tool === "bash") return "bash";
  return "network";
}

function stringField(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AdapterError("A tool call was missing a string field.");
  }
  return value;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
