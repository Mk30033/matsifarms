import { describe, it, expect } from "vitest";
import { usernameToEmail } from "./auth";

describe("username → auth email mapping", () => {
  it("maps the admin username", () => {
    expect(usernameToEmail("Matsi")).toBe("matsi@matsifarms.local");
  });
  it("maps the normal user username", () => {
    expect(usernameToEmail("Matsi Farms")).toBe("matsi-farms@matsifarms.local");
  });
  it("is case-insensitive and ignores extra spaces", () => {
    expect(usernameToEmail("  MATSI   FARMS ")).toBe("matsi-farms@matsifarms.local");
  });
  it("strips characters not allowed in an email local part", () => {
    expect(usernameToEmail("Ada O.")).toBe("ada-o@matsifarms.local");
  });
});
