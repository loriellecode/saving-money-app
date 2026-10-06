// UI wiring. Goal rules live in savings.js.
(function () {
  const S = window.Savings;
  const STORAGE_KEY = "stack-saver.goals.v1";

  const els = {
    form: document.getElementById("goal-form"),
    name: document.getElementById("goal-name"),
    amount: document.getElementById("goal-amount"),
    error: document.getElementById("goal-error"),
    goals: document.getElementById("goals"),
    empty: document.getElementById("empty"),
    vault: document.getElementById("vault-total"),
    toast: document.getElementById("toast"),
    template: document.getElementById("goal-template"),
  };

  let goals = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    } catch {
      // Storage unavailable (private mode etc.) — app still works for this session.
    }
  }

  function update(id, fn) {
    goals = goals.map((g) => (g.id === id ? fn(g) : g));
    save();
    render();
  }

  let toastTimer;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2800);
  }

  function dateStr(ms) {
    return new Date(ms).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function handleBuy(goal, cents) {
    try {
      const wasLocked = S.isLocked(goal);
      const next = S.buyStack(goal, cents);
      update(goal.id, () => next);
      if (wasLocked && !S.isLocked(next)) {
        toast(`Goal reached! "${goal.name}" is unlocked. You can cash out.`);
      } else {
        toast(`Bought a ${S.formatMoney(cents)} stack.`);
      }
    } catch (err) {
      toast(err.message);
    }
  }

  function renderGoal(goal) {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const q = (sel) => node.querySelector(sel);
    const saved = S.savedCents(goal);
    const done = S.isCashedOut(goal);
    const locked = S.isLocked(goal);

    node.classList.toggle("is-done", done);
    q(".goal-name").textContent = goal.name;

    const badge = q(".badge");
    if (done) {
      badge.textContent = "Cashed out";
      badge.classList.add("done");
    } else if (locked) {
      badge.textContent = "🔒 Locked";
      badge.classList.add("locked");
    } else {
      badge.textContent = "🔓 Unlocked";
      badge.classList.add("unlocked");
    }

    q(".saved").textContent = S.formatMoney(saved);
    q(".of").textContent = `of ${S.formatMoney(goal.targetCents)}`;
    q(".bar-fill").style.width = `${Math.round(S.progress(goal) * 100)}%`;

    if (done) {
      q(".remaining").textContent = `Cashed out ${S.formatMoney(saved)} on ${dateStr(goal.cashedOutAt)}.`;
    } else if (locked) {
      q(".remaining").textContent = `${S.formatMoney(S.remainingCents(goal))} to go before you can cash out.`;
    } else {
      q(".remaining").textContent = "Goal reached! Your money is ready.";
    }

    // Stack buttons
    const presets = q(".presets");
    S.STACK_PRESETS.forEach((cents) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = `+ ${S.formatMoney(cents).replace(".00", "")}`;
      b.addEventListener("click", () => handleBuy(goal, cents));
      presets.appendChild(b);
    });

    const custom = q(".custom");
    custom.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = custom.querySelector("input");
      const cents = S.toCents(input.value);
      if (!Number.isInteger(cents) || cents <= 0) {
        toast("Enter a stack amount above $0.");
        return;
      }
      handleBuy(goal, cents);
    });

    // Cash out
    const cash = q(".cashout");
    cash.disabled = !S.canCashOut(goal);
    if (done) {
      cash.textContent = "Cashed out ✓";
    } else if (locked) {
      cash.textContent = `🔒 Cash out locked until ${S.formatMoney(goal.targetCents)}`;
    } else {
      cash.textContent = `Cash out ${S.formatMoney(saved)}`;
    }
    cash.addEventListener("click", () => {
      if (!S.canCashOut(goal)) return;
      if (!confirm(`Cash out ${S.formatMoney(saved)} from "${goal.name}"?`)) return;
      try {
        update(goal.id, (g) => S.cashOut(g));
        toast(`🎉 ${S.formatMoney(saved)} cashed out. Nice saving!`);
      } catch (err) {
        toast(err.message);
      }
    });

    // History
    q(".history summary").textContent =
      `${goal.stacks.length} stack${goal.stacks.length === 1 ? "" : "s"} bought`;
    const list = q(".history ul");
    [...goal.stacks].reverse().forEach((s) => {
      const li = document.createElement("li");
      const when = document.createElement("span");
      const amt = document.createElement("span");
      when.textContent = dateStr(s.at);
      amt.textContent = `+${S.formatMoney(s.amountCents)}`;
      li.append(when, amt);
      list.appendChild(li);
    });

    // Delete (only when nothing is being held)
    const del = q(".delete");
    del.disabled = !S.canDelete(goal);
    if (del.disabled) del.title = "Goals holding money can't be deleted. Reach the goal and cash out first.";
    del.addEventListener("click", () => {
      if (!S.canDelete(goal)) return;
      if (!confirm(`Delete "${goal.name}"?`)) return;
      goals = goals.filter((g) => g.id !== goal.id);
      save();
      render();
    });

    return node;
  }

  function render() {
    els.goals.replaceChildren(...goals.map(renderGoal));
    els.empty.hidden = goals.length > 0;
    const held = goals
      .filter((g) => !S.isCashedOut(g))
      .reduce((sum, g) => sum + S.savedCents(g), 0);
    els.vault.textContent = S.formatMoney(held);
  }

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    els.error.textContent = "";
    try {
      const goal = S.createGoal(els.name.value, S.toCents(els.amount.value));
      goals = [goal, ...goals];
      save();
      render();
      els.form.reset();
      toast(`"${goal.name}" created and locked.`);
    } catch (err) {
      els.error.textContent = err.message;
    }
  });

  render();
})();
