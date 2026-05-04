import { describe, expect, it } from "vitest";
import { collectPlaceholders, renderTemplate } from "../src/core/template-renderer.js";

describe("template renderer", () => {
  it("replaces variables", () => {
    expect(renderTemplate("Hello {{ name }} page {{page}}", { name: "Ember", page: 6 })).toBe("Hello Ember page 6");
  });

  it("collects placeholders once", () => {
    expect(collectPlaceholders("{{a}} {{ b }} {{a}}").sort()).toEqual(["a", "b"]);
  });

  it("fails on missing variables", () => {
    expect(() => renderTemplate("Hello {{name}}", {})).toThrow(/Missing template variables: name/);
  });
});
