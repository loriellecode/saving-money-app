// Core savings-goal rules. No DOM access here so it can be tested in Node.
// All money is stored as integer cents to avoid floating point errors.
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Savings = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const STACK_PRESETS = [1000, 2000, 5000, 10000]; // $10, $20, $50, $100

  function toCents(dollars) {
    const n = typeof dollars === "string" ? Number(dollars.trim()) : dollars;
    if (!Number.isFinite(n)) return NaN;
    return Math.round(n * 100);
  }

  function formatMoney(cents) {
    return (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function createGoal(name, targetCents, now = Date.now()) {
    const trimmed = String(name || "").trim();
    if (!trimmed) throw new Error("Give your goal a name.");
    if (!Number.isInteger(targetCents) || targetCents <= 0) {
      throw new Error("Goal amount must be more than $0.");
    }
    return {
      id: newId(),
      name: trimmed,
      targetCents,
      stacks: [],
      createdAt: now,
      cashedOutAt: null,
    };
  }

  function savedCents(goal) {
    return goal.stacks.reduce((sum, s) => sum + s.amountCents, 0);
  }

  function remainingCents(goal) {
    return Math.max(0, goal.targetCents - savedCents(goal));
  }

  function progress(goal) {
    return Math.min(1, savedCents(goal) / goal.targetCents);
  }

  function isCashedOut(goal) {
    return goal.cashedOutAt !== null;
  }

  // A goal stays locked until every dollar of the target has been saved.
  function isLocked(goal) {
    return savedCents(goal) < goal.targetCents;
  }

  function canCashOut(goal) {
    return !isCashedOut(goal) && !isLocked(goal);
  }

  function buyStack(goal, amountCents, now = Date.now()) {
    if (isCashedOut(goal)) throw new Error("This goal is already cashed out.");
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error("Stack amount must be more than $0.");
    }
    return {
      ...goal,
      stacks: [...goal.stacks, { id: newId(), amountCents, at: now }],
    };
  }

  function cashOut(goal, now = Date.now()) {
    if (isCashedOut(goal)) throw new Error("This goal is already cashed out.");
    if (isLocked(goal)) {
      throw new Error(
        `Locked: save ${formatMoney(remainingCents(goal))} more to cash out.`
      );
    }
    return { ...goal, cashedOutAt: now };
  }

  // Goals holding money can't be deleted, otherwise deleting would be a
  // back door around the lock.
  function canDelete(goal) {
    return isCashedOut(goal) || savedCents(goal) === 0;
  }

  return {
    STACK_PRESETS,
    toCents,
    formatMoney,
    createGoal,
    savedCents,
    remainingCents,
    progress,
    isLocked,
    isCashedOut,
    canCashOut,
    buyStack,
    cashOut,
    canDelete,
  };
});
