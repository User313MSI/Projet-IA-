import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createPendingApproval,
  resolveApproval,
  clearConversationApprovals,
  pendingCount,
  resetApprovals,
  makeApprovalHandler,
  DEFAULT_APPROVAL_TIMEOUT_MS,
} from "../src/approvals.js";
import { ToolRegistry, makeCall, makeContext } from "../src/tools.js";
import { createDefaultTools } from "../src/default-tools.js";
import { makeCommandPolicy } from "../src/security/safe-command.js";
import { Agent } from "../src/agent.js";
import { DEFAULT_SETTINGS } from "@ia-app/shared";
import type { ToolCall } from "@ia-app/shared";

function ctxWithApproval(approve: (c: ToolCall) => Promise<boolean>) {
  return { ...makeContext(process.cwd()), approve };
}

describe("Registre des approbations", () => {
  beforeEach(() => resetApprovals());
  afterEach(() => {
    resetApprovals();
    vi.useRealTimers();
  });

  it("résout par accept (true)", async () => {
    const p = createPendingApproval("c1", "a1", "write_file", { path: "x" }, "test");
    expect(pendingCount()).toBe(1);
    const ok = resolveApproval("a1", true);
    expect(ok).toBe(true);
    await expect(p).resolves.toBe(true);
    expect(pendingCount()).toBe(0);
  });

  it("résout par refuse (false)", async () => {
    const p = createPendingApproval("c1", "a2", "run_command", { command: "ls" }, "test");
    resolveApproval("a2", false);
    await expect(p).resolves.toBe(false);
  });

  it("refus auto après le timeout", async () => {
    vi.useFakeTimers();
    const p = createPendingApproval(
      "c1",
      "a3",
      "write_file",
      { path: "x" },
      "test",
      1000
    );
    vi.advanceTimersByTime(999);
    expect(pendingCount()).toBe(1);
    vi.advanceTimersByTime(2);
    await expect(p).resolves.toBe(false);
    expect(pendingCount()).toBe(0);
  });

  it("timeout par défaut = 120s", () => {
    expect(DEFAULT_APPROVAL_TIMEOUT_MS).toBe(120_000);
  });

  it("double résolution est idempotente (retourne false la 2e fois)", async () => {
    const p = createPendingApproval("c1", "a4", "write_file", { path: "x" }, "test");
    expect(resolveApproval("a4", true)).toBe(true);
    expect(resolveApproval("a4", true)).toBe(false);
    await expect(p).resolves.toBe(true);
  });

  it("résolution d'un id inconnu retourne false", () => {
    expect(resolveApproval("inexistant", true)).toBe(false);
  });

  it("scoping par conversation : clearConversationApprovals refuse tout", async () => {
    const p1 = createPendingApproval("cA", "b1", "write_file", {}, "t");
    const p2 = createPendingApproval("cA", "b2", "write_file", {}, "t");
    const p3 = createPendingApproval("cB", "b3", "write_file", {}, "t");
    clearConversationApprovals("cA");
    await expect(p1).resolves.toBe(false);
    await expect(p2).resolves.toBe(false);
    // cB inchangé jusqu'à résolution
    expect(pendingCount()).toBe(1);
    resolveApproval("b3", true);
    await expect(p3).resolves.toBe(true);
  });
});

describe("makeApprovalHandler", () => {
  beforeEach(() => resetApprovals());
  afterEach(() => resetApprovals());

  it("produit un handler qui crée une approbation résolvable", async () => {
    const handler = makeApprovalHandler("conv");
    const call = makeCall("write_file", { path: "x.txt", content: "y" });
    const p = handler(call);
    resolveApproval(call.id, true);
    await expect(p).resolves.toBe(true);
  });
});

describe("Outils : approbation via handler", () => {
  const reg = new ToolRegistry();
  for (const t of createDefaultTools()) reg.register(t);

  it("write_file refuse sans handler d'approbation", async () => {
    const ctx = makeContext(process.cwd());
    const r = await reg.execute(
      makeCall("write_file", { path: `./__appr_nohandler_${Date.now()}.txt`, content: "x" }),
      ctx
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/approbation/);
  });

  it("write_file exécute avec approbation acceptée", async () => {
    const ctx = ctxWithApproval(() => Promise.resolve(true));
    const target = `./__appr_ok_${Date.now()}.txt`;
    const r = await reg.execute(
      makeCall("write_file", { path: target, content: "data" }),
      ctx
    );
    expect(r.ok).toBe(true);
    const { rm } = await import("node:fs/promises");
    await rm(target, { force: true });
  });

  it("write_file refuse avec approbation refusée", async () => {
    const ctx = ctxWithApproval(() => Promise.resolve(false));
    const target = `./__appr_no_${Date.now()}.txt`;
    const r = await reg.execute(
      makeCall("write_file", { path: target, content: "data" }),
      ctx
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/non approuvée|refusée/);
    const { rm } = await import("node:fs/promises");
    await rm(target, { force: true });
  });

  it("run_command hors allowlist refuse hors power user même avec approbation", async () => {
    const ctx = ctxWithApproval(() => Promise.resolve(true));
    const r = await reg.execute(
      makeCall("run_command", { command: "node -e '1'" }),
      ctx
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/interdite|liste blanche/);
  });

  it("run_command hors allowlist en power user exécute avec approbation", async () => {
    const ctx = {
      ...makeContext(process.cwd(), { commandPolicy: makeCommandPolicy(true) }),
      approve: () => Promise.resolve(true),
    };
    // `node -e` n'est pas dans la liste blanche : approbation requise (power user).
    // node -e est multiplateforme (fonctionne sur Windows et Linux).
    const r = await reg.execute(
      makeCall("run_command", { command: "node -e \"process.stdout.write('powerok')\"" }),
      ctx
    );
    expect(r.ok).toBe(true);
    expect(r.output).toMatch(/powerok/);
  });

  it("run_command destructeur (rm -rf) reste refusé même en power user + approbation", async () => {
    const ctx = {
      ...makeContext(process.cwd(), { commandPolicy: makeCommandPolicy(true) }),
      approve: () => Promise.resolve(true),
    };
    const r = await reg.execute(
      makeCall("run_command", { command: "rm -rf x" }),
      ctx
    );
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/interdite/);
  });
});

describe("Agent.toolNeedsApproval (émission approval_required)", () => {
  function makeAgent(approve: boolean) {
    const settings = { ...DEFAULT_SETTINGS, ollamaUrl: "http://127.0.0.1:11434" };
    return new Agent({
      settings,
      cwd: process.cwd(),
      powerUser: true,
      approve: approve ? () => Promise.resolve(true) : undefined,
    });
  }

  it("write_file déclenche une approbation quand un handler est fourni", async () => {
    const agent = makeAgent(true);
    const yes = await agent.toolNeedsApproval(
      makeCall("write_file", { path: "a.txt", content: "x" })
    );
    expect(yes).toBe(true);
  });

  it("commande de la liste blanche ne déclenche pas d'approbation", async () => {
    const agent = makeAgent(true);
    const yes = await agent.toolNeedsApproval(
      makeCall("run_command", { command: "ls -la" })
    );
    expect(yes).toBe(false);
  });

  it("commande hors liste blanche en power user déclenche une approbation", async () => {
    const agent = makeAgent(true);
    const yes = await agent.toolNeedsApproval(
      makeCall("run_command", { command: "node script.js" })
    );
    expect(yes).toBe(true);
  });

  it("commande hors liste blanche hors power user ne déclenche pas d'approbation (refus direct)", async () => {
    const settings = { ...DEFAULT_SETTINGS, ollamaUrl: "http://127.0.0.1:11434" };
    const agent = new Agent({
      settings,
      cwd: process.cwd(),
      powerUser: false,
      approve: () => Promise.resolve(true),
    });
    const yes = await agent.toolNeedsApproval(
      makeCall("run_command", { command: "node script.js" })
    );
    expect(yes).toBe(false);
  });

  it("sans handler approve, rien ne déclenche d'approbation", async () => {
    const agent = makeAgent(false);
    const yes = await agent.toolNeedsApproval(
      makeCall("write_file", { path: "a.txt", content: "x" })
    );
    expect(yes).toBe(false);
  });

  it("outil non sensible (calc) ne déclenche pas d'approbation", async () => {
    const agent = makeAgent(true);
    const yes = await agent.toolNeedsApproval(
      makeCall("calc", { expression: "2+2" })
    );
    expect(yes).toBe(false);
  });
});
