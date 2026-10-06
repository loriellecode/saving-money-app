const test = require("node:test");
const assert = require("node:assert");
const S = require("./savings.js");

test("toCents parses dollars safely", () => {
  assert.strictEqual(S.toCents("10"), 1000);
  assert.strictEqual(S.toCents("0.1"), 10);
  assert.strictEqual(S.toCents(19.99), 1999);
  assert.ok(Number.isNaN(S.toCents("abc")));
});

test("createGoal validates input", () => {
  assert.throws(() => S.createGoal("", 1000));
  assert.throws(() => S.createGoal("Bike", 0));
  assert.throws(() => S.createGoal("Bike", -500));
  const g = S.createGoal("  Bike  ", 5000);
  assert.strictEqual(g.name, "Bike");
  assert.strictEqual(S.savedCents(g), 0);
});

test("goal stays locked until the full amount is saved", () => {
  let g = S.createGoal("Bike", 5000);
  assert.ok(S.isLocked(g));
  assert.ok(!S.canCashOut(g));
  assert.throws(() => S.cashOut(g), /Locked/);

  g = S.buyStack(g, 2000);
  g = S.buyStack(g, 2000);
  assert.strictEqual(S.remainingCents(g), 1000);
  assert.ok(S.isLocked(g));
  assert.throws(() => S.cashOut(g), /\$10\.00 more/);

  g = S.buyStack(g, 1000);
  assert.ok(!S.isLocked(g));
  assert.ok(S.canCashOut(g));
});

test("buying past the goal still unlocks and progress caps at 100%", () => {
  let g = S.createGoal("Shoes", 1500);
  g = S.buyStack(g, 2000);
  assert.strictEqual(S.savedCents(g), 2000);
  assert.strictEqual(S.remainingCents(g), 0);
  assert.strictEqual(S.progress(g), 1);
  assert.ok(S.canCashOut(g));
});

test("buyStack rejects bad amounts", () => {
  const g = S.createGoal("Bike", 5000);
  assert.throws(() => S.buyStack(g, 0));
  assert.throws(() => S.buyStack(g, -100));
  assert.throws(() => S.buyStack(g, 10.5));
});

test("cash out happens once and closes the goal", () => {
  let g = S.buyStack(S.createGoal("Bike", 1000), 1000);
  g = S.cashOut(g, 123);
  assert.strictEqual(g.cashedOutAt, 123);
  assert.ok(!S.canCashOut(g));
  assert.throws(() => S.cashOut(g));
  assert.throws(() => S.buyStack(g, 1000));
});

test("goals holding money cannot be deleted", () => {
  let g = S.createGoal("Bike", 5000);
  assert.ok(S.canDelete(g));
  g = S.buyStack(g, 1000);
  assert.ok(!S.canDelete(g));
  g = S.buyStack(g, 4000);
  assert.ok(!S.canDelete(g));
  g = S.cashOut(g);
  assert.ok(S.canDelete(g));
});
