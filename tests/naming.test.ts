import { describe, expect, it } from "vitest";
import { padPage, seekPageBaseName, slugify } from "../src/core/naming.js";

describe("naming", () => {
  it("slugifies stable file names", () => {
    expect(slugify("Cloud Bakery!")).toBe("cloud-bakery");
  });

  it("pads page numbers", () => {
    expect(padPage(6)).toBe("006");
  });

  it("builds seek page base names", () => {
    expect(seekPageBaseName(6, "Cloud Bakery")).toBe("book01-page006-cloud-bakery");
  });
});
