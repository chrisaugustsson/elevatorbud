import { describe, it, expect, vi } from "vitest";
import { getEffectiveOrganizationIds } from "./effective-org-ids.js";

function createMockDb(
  directGrants: string[],
  childrenByParent: Record<string, string[]>,
) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          return directGrants.map((id) => ({ organizationId: id }));
        }),
      }),
    }),
    // Second call uses a different select shape (for children query)
  } as any;
}

function createSequencedMockDb(
  directGrants: string[],
  children: string[],
) {
  let callCount = 0;
  const mockSelect = vi.fn().mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return directGrants.map((id) => ({ organizationId: id }));
        }
        return children.map((id) => ({ id }));
      }),
    }),
  }));

  return { select: mockSelect } as any;
}

describe("getEffectiveOrganizationIds", () => {
  it("returns empty array for user with no grants", async () => {
    const db = createSequencedMockDb([], []);
    const result = await getEffectiveOrganizationIds(db, "user-1");
    expect(result).toEqual([]);
  });

  it("returns only the direct grant when org has no children", async () => {
    const db = createSequencedMockDb(["org-standalone"], []);
    const result = await getEffectiveOrganizationIds(db, "user-1");
    expect(result).toEqual(["org-standalone"]);
  });

  it("returns direct grant plus children when org has children", async () => {
    const db = createSequencedMockDb(
      ["org-root"],
      ["org-child-a", "org-child-b"],
    );
    const result = await getEffectiveOrganizationIds(db, "user-1");
    expect(result.sort()).toEqual(
      ["org-root", "org-child-a", "org-child-b"].sort(),
    );
  });

  it("returns grants from multiple roots with all their children", async () => {
    const db = createSequencedMockDb(
      ["org-root-1", "org-root-2"],
      ["org-child-1a", "org-child-1b", "org-child-2a"],
    );
    const result = await getEffectiveOrganizationIds(db, "user-1");
    expect(result.sort()).toEqual(
      [
        "org-root-1",
        "org-root-2",
        "org-child-1a",
        "org-child-1b",
        "org-child-2a",
      ].sort(),
    );
  });

  it("deduplicates when direct grant appears in children result", async () => {
    const db = createSequencedMockDb(
      ["org-root", "org-child-a"],
      ["org-child-a", "org-child-b"],
    );
    const result = await getEffectiveOrganizationIds(db, "user-1");
    expect(result.sort()).toEqual(
      ["org-root", "org-child-a", "org-child-b"].sort(),
    );
    expect(new Set(result).size).toBe(result.length);
  });
});
