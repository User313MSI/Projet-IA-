import { describe, it, expect } from "vitest";
import { ToolRegistry, makeCall, makeContext } from "../src/tools.js";
import { createDefaultTools } from "../src/default-tools.js";
import { DEFAULT_SETTINGS } from "@ia-app/shared";

describe("ToolRegistry", () => {
  it("enregistre et liste les outils", () => {
    const reg = new ToolRegistry();
    for (const t of createDefaultTools()) reg.register(t);
    const defs = reg.definitions();
    expect(defs.length).toBe(5);
    expect(defs.map((d) => d.name).sort()).toEqual([
      "calc",
      "list_dir",
      "read_file",
      "run_command",
      "write_file",
    ]);
    expect(reg.has("calc")).toBe(true);
    expect(reg.has("nope")).toBe(false);
  });

  it("calcule une expression", async () => {
    const reg = new ToolRegistry();
    for (const t of createDefaultTools()) reg.register(t);
    const result = await reg.execute(
      makeCall("calc", { expression: "2+2*3" }),
      makeContext(process.cwd())
    );
    expect(result.ok).toBe(true);
    expect(result.output).toBe("8");
  });

  it("rejette une expression interdite", async () => {
    const reg = new ToolRegistry();
    for (const t of createDefaultTools()) reg.register(t);
    const result = await reg.execute(
      makeCall("calc", { expression: "process.exit(1)" }),
      makeContext(process.cwd())
    );
    expect(result.ok).toBe(false);
    // Le parseur sécurisé rejette process comme fonction inconnue (pas d'exécution de code)
    expect(result.error).toMatch(/fonction inconnue|caractère interdit|invalide/);
  });

  it("écrit puis lit un fichier", async () => {
    const reg = new ToolRegistry();
    for (const t of createDefaultTools()) reg.register(t);
    const ctx = {
      ...makeContext(process.cwd()),
      approve: () => Promise.resolve(true),
    };
    const target = `./__vitest_tmp_${Date.now()}.txt`;
    const w = await reg.execute(
      makeCall("write_file", { path: target, content: "hello" }),
      ctx
    );
    expect(w.ok).toBe(true);
    const r = await reg.execute(makeCall("read_file", { path: target }), ctx);
    expect(r.ok).toBe(true);
    expect(r.output).toBe("hello");
    const { rm } = await import("node:fs/promises");
    await rm(target, { force: true });
  });

  it("gère un outil inconnu", async () => {
    const reg = new ToolRegistry();
    const result = await reg.execute(makeCall("ghost", {}), makeContext(process.cwd()));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Outil inconnu/);
  });
});

describe("DEFAULT_SETTINGS", () => {
  it("utilise qwen2.5:14b par défaut", () => {
    expect(DEFAULT_SETTINGS.model).toBe("qwen2.5:14b");
  });
});
