import { describe, it, expect } from "vitest";
import { partitionParentChangeImpact, type AffectedUser } from "./organization";

/**
 * US-023 dedupe: when an org moves from one parent to another, a user who
 * holds direct grants on BOTH parents (or a direct grant on the moved org
 * itself) has no net access change. Without the dedupe, such users would
 * double-report in both gained AND lost, misleading the admin about the
 * real blast radius of the parent change.
 *
 * The underlying `computeParentChangeImpact` is a DB round-trip, but the
 * partitioning is pure — tested here without Postgres.
 */

const u = (id: string, name = `User ${id}`): AffectedUser => ({
  id,
  name,
  email: `${id}@example.com`,
});

describe("partitionParentChangeImpact", () => {
  it("reports a user only on the old parent as lost", () => {
    const result = partitionParentChangeImpact([u("a")], [], []);
    expect(result.lost).toHaveLength(1);
    expect(result.lost[0]!.id).toBe("a");
    expect(result.gained).toHaveLength(0);
  });

  it("reports a user only on the new parent as gained", () => {
    const result = partitionParentChangeImpact([], [u("b")], []);
    expect(result.gained).toHaveLength(1);
    expect(result.gained[0]!.id).toBe("b");
    expect(result.lost).toHaveLength(0);
  });

  it("dedupes a user with grants on BOTH old and new parent — no net change", () => {
    // Same user appears in both old and new — inherited access to the
    // moved org is unchanged (they still reach it via the new parent).
    const result = partitionParentChangeImpact([u("a")], [u("a")], []);
    expect(result.gained).toHaveLength(0);
    expect(result.lost).toHaveLength(0);
  });

  it("dedupes a user with a direct grant on the moved org itself", () => {
    // A direct grant on the org being moved beats any parent inheritance —
    // the access never flowed through the parent to begin with.
    const result = partitionParentChangeImpact([u("a")], [u("b")], ["a", "b"]);
    expect(result.gained).toHaveLength(0);
    expect(result.lost).toHaveLength(0);
  });

  it("handles a mix: some lost, some gained, some dedupes", () => {
    // a only on old → lost
    // b only on new → gained
    // c on both → dedupe
    // d has direct grant on moved org → dedupe on both sides
    const result = partitionParentChangeImpact(
      [u("a"), u("c"), u("d")],
      [u("b"), u("c"), u("d")],
      ["d"],
    );
    expect(result.lost.map((x) => x.id).sort()).toEqual(["a"]);
    expect(result.gained.map((x) => x.id).sort()).toEqual(["b"]);
  });

  it("returns empty arrays when neither parent has grants", () => {
    const result = partitionParentChangeImpact([], [], []);
    expect(result.gained).toEqual([]);
    expect(result.lost).toEqual([]);
  });
});
