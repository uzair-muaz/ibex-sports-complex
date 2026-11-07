import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * A "use server" file turns EVERY export into an action a browser can call,
 * with no sign-in check unless the function adds one. Library helpers (give
 * points, activate membership, credit wallet…) must never be like that; the
 * checked actions live in app/actions/.
 */
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

describe("lib/ has no server-action files", () => {
  it("no file in lib/ starts with \"use server\"", () => {
    const bad = files(path.resolve(__dirname, "../../lib")).filter((f) =>
      /^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use server["']/.test(fs.readFileSync(f, "utf8")),
    );
    expect(bad.map((f) => path.relative(process.cwd(), f))).toEqual([]);
  });
});
