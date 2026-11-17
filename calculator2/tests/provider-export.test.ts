import { describe, expect, test } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GUIDED_PROVIDERS, GUIDES, POPULAR, TRAP_FIELDS, exampleFor, pointersFor, templateFor, type GuideField,
} from "../src/guided/providerGuide";

/**
 * The site's prebuild scripts read provider guidance from new-site/src/data/provider-guides.json
 * instead of parsing providerGuide.ts. Regenerate it with:
 *   EXPORT_PROVIDER_GUIDES=1 npx vitest run tests/provider-export.test.ts
 */
const FIELDS: GuideField[] = ["baseValue", "driveaway", "defer", "docFee", "financedInsurance", "residual", "payment", "luxAdj", "running", "insurance", "fees"];
const OUT = resolve(__dirname, "../../new-site/src/data/provider-guides.json");

function exportGuides() {
  return {
    note: "Generated from calculator2/src/guided/providerGuide.ts by tests/provider-export.test.ts. Do not edit.",
    popular: POPULAR,
    providers: GUIDED_PROVIDERS.map(({ id, label }) => {
      const guide = GUIDES.find((g) => g.id === id)!;
      return {
        id,
        label,
        seen: guide.seen,
        sourceCount: guide.sources.length,
        // A field may have a second pointer for an alternate quote layout.
        // Keep the primary instruction in the article's one-line trap summary.
        written: guide.pointers.reduce((written, pointer) => {
          if (!(pointer.field in written)) written[pointer.field] = pointer.text;
          return written;
        }, {} as Partial<Record<GuideField, string>>),
        traps: TRAP_FIELDS[id] ?? [],
        pointers: FIELDS.flatMap((field) => pointersFor(id, field).map((p) => {
          const example = p.example ?? exampleFor(id, field);
          return {
            field,
            kind: p.kind,
            text: p.text,
            ...(p.more ? { more: p.more } : {}),
            image: example?.image ?? (p.notShown ? null : templateFor(id, field)),
          };
        })),
      };
    }),
  };
}

describe("provider guide export for the site", () => {
  test("committed JSON matches providerGuide.ts", () => {
    const fresh = `${JSON.stringify(exportGuides(), null, 2)}\n`;
    if (process.env.EXPORT_PROVIDER_GUIDES) writeFileSync(OUT, fresh);
    expect(existsSync(OUT), "run with EXPORT_PROVIDER_GUIDES=1 to create it").toBe(true);
    expect(readFileSync(OUT, "utf8"), "stale: rerun with EXPORT_PROVIDER_GUIDES=1").toBe(fresh);
  });
});
