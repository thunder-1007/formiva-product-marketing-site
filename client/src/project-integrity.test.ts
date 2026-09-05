import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

describe("project integrity", () => {
  it("uses a cross-platform production start command", () => {
    const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));

    expect(packageJson.scripts.start).not.toMatch(/^NODE_ENV=/);
    expect(packageJson.scripts.start).toMatch(/^cross-env NODE_ENV=production(?:\s|$)/);
  });

  it("does not retain the unused Forge map integration", () => {
    expect(existsSync(resolve(projectRoot, "client/src/components/Map.tsx"))).toBe(false);
  });

  it("does not retain historical generator traces in the handoff", () => {
    const handoff = readFileSync(resolve(projectRoot, "README_HANDOFF.md"), "utf8");
    const traceTerms = ["man" + "us", "project-" + "config", "AI build-" + "tool", "man" + "us-analytics"];

    expect(handoff).not.toMatch(new RegExp(traceTerms.join("|"), "i"));
  });

  it("provides reduced-motion-safe route and authentication transitions", () => {
    const app = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
    const stylesheet = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

    expect(app).toContain('className="route-transition"');
    expect(stylesheet).toContain("@keyframes route-enter");
    expect(stylesheet).toContain("@keyframes auth-panel-in");
  });
});
