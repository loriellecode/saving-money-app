// UI for Stack Saver. Goal rules live in savings.js.
(function () {
  const S = window.Savings;
  const STORAGE_KEY = "stack-saver.goals.v1";

  const app = document.getElementById("app");
  const screen = document.getElementById("screen");
  const toastEl = document.getElementById("toast");
  const modal = document.getElementById("modal");

  let goals = load();

  // In-progress keypad entries for the buy and new-goal screens.
  const draft = {
    buyGoalId: null,
    buyAmount: "",
    buyBack: "#/home",
    newName: "",
    newAmount: "",
  };

  // ---------- storage ----------

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

  const find = (id) => goals.find((g) => g.id === id);
  const openGoals = () => goals.filter((g) => !S.isCashedOut(g));

  function replaceGoal(next) {
    goals = goals.map((g) => (g.id === next.id ? next : g));
    save();
  }

  // ---------- formatting ----------

  const money = S.formatMoney;
  const moneyShort = (c) => (c % 100 === 0 ? money(c).replace(/\.00$/, "") : money(c));

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch]);
  }

  function startOfDay(ms) {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function dayLabel(ms) {
    const diff = Math.round((startOfDay(Date.now()) - startOfDay(ms)) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return new Date(ms).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  const timeStr = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const shortDate = (ms) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  // ---------- icons ----------

  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    stack: '<path d="M12 3 3 8l9 5 9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
    cashout: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    backspace: '<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m12 9 6 6M18 9l-6 6"/>',
  };

  function icon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  }

  // App mark: a stack of bars pinned by a lock bar.
  function logo() {
    return '<svg class="logo" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M8 16h32M12 24h24M16 32h16M24 7v34"/></svg>';
  }

  const AVATAR_COLORS = ["#4f7bff", "#16a35a", "#f07a2b", "#9b5cff", "#0aa2b5", "#e5484d", "#d99a00"];

  function avatar(goal, cls) {
    let h = 0;
    for (const ch of goal.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const letter = Array.from(goal.name)[0].toUpperCase();
    return `<span class="avatar ${cls}" style="background:${AVATAR_COLORS[h % AVATAR_COLORS.length]}" aria-hidden="true">${esc(letter)}</span>`;
  }

  function status(goal) {
    if (S.isCashedOut(goal)) return { key: "done", label: "Cashed out", icon: "check" };
    if (S.isLocked(goal)) return { key: "locked", label: "Locked", icon: "lock" };
    return { key: "ready", label: "Unlocked", icon: "unlock" };
  }

  const pct = (goal) => Math.floor(S.progress(goal) * 100);

  // ---------- shared pieces ----------

  function tile(iconName, label, attrs, extraClass = "") {
    return `<button type="button" class="tile ${extraClass}" ${attrs}>
      <span class="tile-ico">${icon(iconName)}</span>
      <span class="tile-label">${label}</span>
    </button>`;
  }

  function activityItems(list) {
    const items = [];
    list.forEach((g) => {
      g.stacks.forEach((s) => items.push({ goal: g, out: false, cents: s.amountCents, at: s.at }));
      if (S.isCashedOut(g)) items.push({ goal: g, out: true, cents: S.savedCents(g), at: g.cashedOutAt });
    });
    return items.sort((a, b) => b.at - a.at);
  }

  function activityList(items, showGoal) {
    let html = "";
    let lastDay = "";
    items.forEach((it) => {
      const day = dayLabel(it.at);
      if (day !== lastDay) {
        html += `<p class="group-label">${day}</p>`;
        lastDay = day;
      }
      const title = showGoal ? esc(it.goal.name) : it.out ? "Cash out" : "Stack";
      const sub = it.out ? "Released from vault" : showGoal ? "Stack bought" : "Added to vault";
      html += `<div class="row">
        <span class="row-ico ${it.out ? "out" : ""}">${icon(it.out ? "cashout" : "stack")}</span>
        <span class="row-main"><b>${title}</b><small>${sub}</small></span>
        <span class="row-end"><b>${it.out ? "−" : "+"}${money(it.cents)}</b><small>${timeStr(it.at)}</small></span>
      </div>`;
    });
    return html;
  }

  function keypad() {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
    return `<div class="keypad">${keys
      .map((k) => {
        const label = k === "back" ? "Delete" : k === "." ? "Decimal point" : k;
        return `<button type="button" class="key" data-action="key" data-key="${k}" aria-label="${label}">${k === "back" ? icon("backspace") : k}</button>`;
      })
      .join("")}</div>`;
  }

  // Keypad input is kept as a string so "12." and "12.5" display as typed.
  function pressKey(value, key) {
    if (key === "back") return value.slice(0, -1);
    if (key === ".") return value.includes(".") ? value : (value || "0") + ".";
    const [whole, frac] = value.split(".");
    if (frac !== undefined && frac.length >= 2) return value;
    if (frac === undefined && whole.length >= 7) return value;
    if (value === "0") return key;
    return value + key;
  }

  function keyedCents(value) {
    const c = S.toCents(value || "0");
    return Number.isFinite(c) ? c : 0;
  }

  function amountHtml(value) {
    const [whole, frac] = (value || "0").split(".");
    const shown = Number(whole || "0").toLocaleString("en-US") + (frac === undefined ? "" : "." + frac);
    return `$${shown}<span class="caret"></span>`;
  }

  // ---------- screens ----------

  function welcomeView() {
    return `<div class="welcome">
      <div class="welcome-top"><span class="welcome-brand">Stack Saver</span></div>
      <div class="welcome-mark">${logo()}</div>
      <div class="welcome-copy">
        <h1>Save it.<br />Lock it.<br />Stack it up.</h1>
        <p>Set a goal and buy stacks toward it. Your money stays locked in the vault until every dollar of the goal is saved.</p>
        <a class="btn-white" href="#/new">Create your first goal</a>
        <a class="btn-text" href="#/home">${goals.length ? "Go to my goals" : "Look around first"}</a>
      </div>
    </div>`;
  }

  function homeView() {
    const open = openGoals();
    const held = open.reduce((sum, g) => sum + S.savedCents(g), 0);
    const ready = open.filter(S.canCashOut).length;
    const sorted = [...open, ...goals.filter(S.isCashedOut)];
    const activity = activityItems(goals).slice(0, 20);

    const coins = open.length
      ? `<div class="coins">${open
          .map((g) => `<a class="coin" href="#/goal/${g.id}">
              ${avatar(g, "round")}
              <span><small>${esc(g.name)}</small><b>${money(S.savedCents(g))}</b></span>
            </a>`)
          .join("")}</div>`
      : "";

    const goalRows = sorted.length
      ? sorted.map(goalRow).join("")
      : `<div class="empty">
          <p><b>No goals yet</b><br />Create a goal, then buy stacks until it unlocks.</p>
          <a class="btn-dark small" href="#/new">Create a goal</a>
        </div>`;

    return `<div class="hero">
      <header class="topbar">
        <div class="brand">${logo()}<span>Stack Saver</span></div>
        <a class="icon-btn glass" href="#/new" aria-label="New goal">${icon("plus")}</a>
      </header>
      ${coins}
      <p class="hero-label">Held in vault</p>
      <p class="hero-amount">${money(held)}</p>
      <div class="hero-meta">
        <span class="pill-mini">${icon("lock")}${open.length - ready} locked</span>
        <span class="pill-mini">${icon("unlock")}${ready} ready</span>
      </div>
      <div class="tiles">
        ${tile("plus", "Buy stack", 'data-action="buy-any"')}
        ${tile("target", "New goal", 'data-action="nav" data-href="#/new"')}
        ${tile("cashout", "Cash out", 'data-action="cashout-any"')}
        ${tile("list", "Activity", 'data-action="scroll" data-target="activity"')}
      </div>
    </div>
    <section class="panel">
      <div class="panel-head"><h2>Goals</h2><span>${open.length} active</span></div>
      ${goalRows}
      <div class="panel-head" id="activity"><h2>Activity</h2></div>
      ${activity.length ? activityList(activity, true) : '<p class="muted-note">Stacks you buy will show up here.</p>'}
    </section>`;
  }

  function goalRow(g) {
    const st = status(g);
    const sub =
      st.key === "locked" ? `${money(S.remainingCents(g))} to go`
      : st.key === "ready" ? "Ready to cash out"
      : `Cashed out ${shortDate(g.cashedOutAt)}`;
    return `<a class="row" href="#/goal/${g.id}">
      ${avatar(g, "sq")}
      <span class="row-main">
        <b>${esc(g.name)}</b>
        <small class="st-${st.key}">${icon(st.icon)}${sub}</small>
        <span class="mini-bar ${st.key}"><span style="width:${pct(g)}%"></span></span>
      </span>
      <span class="row-end"><b>${money(S.savedCents(g))}</b><small>of ${moneyShort(g.targetCents)}</small></span>
    </a>`;
  }

  function goalView(g) {
    const st = status(g);
    const saved = S.savedCents(g);
    const done = st.key === "done";
    const meta =
      st.key === "locked" ? `${money(S.remainingCents(g))} to go`
      : st.key === "ready" ? "Goal reached"
      : `Cashed out ${shortDate(g.cashedOutAt)}`;
    const history = activityItems([g]);

    const cashTile = done
      ? tile("check", "Cashed out", "disabled")
      : st.key === "locked"
        ? tile("lock", "Cash out locked", `data-action="cashout" data-id="${g.id}"`, "is-locked")
        : tile("cashout", `Cash out ${moneyShort(saved)}`, `data-action="cashout" data-id="${g.id}"`, "is-ready");

    return `<div class="hero">
      <header class="topbar">
        <a class="icon-btn glass" href="#/home" aria-label="Back">${icon("back")}</a>
        <span class="topbar-title">Goal</span>
        <button type="button" class="icon-btn glass" data-action="delete" data-id="${g.id}" aria-label="Delete goal">${icon("trash")}</button>
      </header>
      <div class="goal-title">
        ${avatar(g, "lg")}
        <div><h1>${esc(g.name)}</h1><span class="badge ${st.key}">${icon(st.icon)}${st.label}</span></div>
      </div>
      <p class="hero-amount">${money(saved)}</p>
      <p class="hero-sub">of ${money(g.targetCents)} goal</p>
      <div class="progress ${st.key}"><span style="width:${pct(g)}%"></span></div>
      <div class="progress-meta"><span>${pct(g)}% saved</span><span>${meta}</span></div>
      <div class="tiles two">
        ${tile("plus", "Buy a stack", done ? "disabled" : `data-action="nav" data-href="#/buy/${g.id}"`)}
        ${cashTile}
      </div>
    </div>
    <section class="panel">
      <div class="panel-head"><h2>Stacks</h2><span>${g.stacks.length} bought</span></div>
      ${history.length ? activityList(history, false) : '<p class="muted-note">No stacks yet. Buy your first stack to start filling this goal.</p>'}
    </section>`;
  }

  function buyView() {
    const open = openGoals();
    if (!open.length) {
      return `<div class="pay">
        <header class="pay-head">
          <a class="icon-btn" href="#/home" aria-label="Back">${icon("back")}</a>
          <h1>Buy a stack</h1><span></span>
        </header>
        <div class="empty pay-empty">
          <p><b>No open goals</b><br />Stacks go toward a goal. Create one first.</p>
          <a class="btn-dark small" href="#/new">Create a goal</a>
        </div>
      </div>`;
    }
    return `<div class="pay">
      <header class="pay-head">
        <a class="icon-btn" href="${draft.buyBack}" aria-label="Back">${icon("back")}</a>
        <h1>Buy a stack</h1><span></span>
      </header>
      <p class="field-label">Goal</p>
      <div class="chip-row">${open
        .map((g) => `<button type="button" class="chip" data-action="pick-goal" data-id="${g.id}">
            ${avatar(g, "chip-av")}
            <span><b>${esc(g.name)}</b><small>${moneyShort(S.savedCents(g))} / ${moneyShort(g.targetCents)}</small></span>
          </button>`)
        .join("")}</div>
      <p class="field-label">Quick stacks</p>
      <div class="chip-row" id="buy-quick"></div>
      <div class="amount-wrap">
        <p class="amount" id="buy-amount"></p>
        <p class="amount-hint" id="buy-hint"></p>
      </div>
      <div class="pad-panel">
        ${keypad()}
        <button type="button" class="btn-dark" id="buy-submit" data-action="buy-submit"></button>
      </div>
    </div>`;
  }

  function newView() {
    return `<div class="pay">
      <header class="pay-head">
        <a class="icon-btn" href="#/home" aria-label="Back">${icon("back")}</a>
        <h1>New goal</h1><span></span>
      </header>
      <label class="field-label" for="goal-name">What are you saving for?</label>
      <input id="goal-name" class="name-input" type="text" placeholder="New bike" maxlength="40" autocomplete="off" />
      <p class="field-label">Goal amount</p>
      <div class="amount-wrap">
        <p class="amount" id="new-amount"></p>
        <p class="amount-hint">${icon("lock")} Locked until it's fully funded. No early cash out.</p>
      </div>
      <div class="pad-panel">
        ${keypad()}
        <button type="button" class="btn-dark" id="new-submit" data-action="new-submit"></button>
      </div>
    </div>`;
  }

  // ---------- partial updates for keypad screens ----------

  function updateBuy(goalChanged) {
    const goal = find(draft.buyGoalId);
    const cents = keyedCents(draft.buyAmount);

    screen.querySelectorAll('[data-action="pick-goal"]').forEach((el) => {
      el.classList.toggle("selected", el.dataset.id === draft.buyGoalId);
    });

    const quick = screen.querySelector("#buy-quick");
    if (goalChanged) {
      const rem = goal ? S.remainingCents(goal) : 0;
      const chips = S.STACK_PRESETS.map((c) => ({ cents: c, label: moneyShort(c), sub: "stack", ico: "stack" }));
      if (rem > 0 && !S.STACK_PRESETS.includes(rem)) {
        chips.unshift({ cents: rem, label: money(rem), sub: "finish goal", ico: "check" });
      }
      quick.innerHTML = chips
        .map((c) => `<button type="button" class="chip" data-action="quick" data-cents="${c.cents}">
            <span class="chip-ico">${icon(c.ico)}</span>
            <span><b>${c.label}</b><small>${c.sub}</small></span>
          </button>`)
        .join("");
    }
    quick.querySelectorAll(".chip").forEach((el) => {
      el.classList.toggle("selected", Number(el.dataset.cents) === cents);
    });

    const amountEl = screen.querySelector("#buy-amount");
    amountEl.innerHTML = amountHtml(draft.buyAmount);
    amountEl.classList.toggle("empty", cents === 0);

    const hint = screen.querySelector("#buy-hint");
    let text = "";
    let good = false;
    if (goal) {
      const locked = S.isLocked(goal);
      const after = S.savedCents(goal) + cents;
      if (cents === 0) {
        text = locked ? `${icon("lock")} ${money(S.remainingCents(goal))} to go until it unlocks` : `${icon("unlock")} Goal reached. Extra stacks are welcome.`;
      } else if (locked && after >= goal.targetCents) {
        text = `${icon("unlock")} This stack unlocks your goal!`;
        good = true;
      } else if (locked) {
        text = `${money(goal.targetCents - after)} to go after this stack`;
      } else {
        text = "Extra savings on top of your goal";
      }
    }
    hint.innerHTML = text;
    hint.classList.toggle("good", good);

    const btn = screen.querySelector("#buy-submit");
    btn.disabled = !goal || cents <= 0;
    btn.textContent = cents > 0 ? `Buy ${money(cents)} stack` : "Enter an amount";
  }

  function updateNew() {
    const cents = keyedCents(draft.newAmount);
    const amountEl = screen.querySelector("#new-amount");
    amountEl.innerHTML = amountHtml(draft.newAmount);
    amountEl.classList.toggle("empty", cents === 0);
    const btn = screen.querySelector("#new-submit");
    btn.disabled = cents <= 0 || !draft.newName.trim();
    btn.textContent = cents > 0 ? `Create & lock ${money(cents)} goal` : "Create & lock goal";
  }

  // ---------- routing ----------

  function parseRoute() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    return { name: parts[0] || "", id: parts[1] ? decodeURIComponent(parts[1]) : null };
  }

  function mount(kind, html) {
    app.dataset.screen = kind;
    screen.className = `screen screen-${kind}`;
    screen.innerHTML = html;
    screen.scrollTop = 0;
  }

  function renderRoute() {
    closeModal(false);
    const r = parseRoute();
    const name = r.name || (goals.length ? "home" : "welcome");

    if (name === "welcome") return mount("welcome", welcomeView());
    if (name === "home") return mount("home", homeView());

    if (name === "goal") {
      const g = find(r.id);
      if (!g) return location.replace("#/home");
      return mount("goal", goalView(g));
    }

    if (name === "buy") {
      const open = openGoals();
      const fromRoute = open.find((g) => g.id === r.id);
      draft.buyGoalId = (fromRoute || open[0] || {}).id || null;
      draft.buyBack = fromRoute ? `#/goal/${fromRoute.id}` : "#/home";
      draft.buyAmount = "";
      mount("buy", buyView());
      if (open.length) updateBuy(true);
      return;
    }

    if (name === "new") {
      draft.newName = "";
      draft.newAmount = "";
      mount("new", newView());
      updateNew();
      // Only autofocus where it won't pop a phone keyboard over the keypad.
      if (matchMedia("(hover: hover)").matches) screen.querySelector("#goal-name").focus();
      return;
    }

    location.replace("#/home");
  }

  // ---------- actions ----------

  let toastTimer;
  function toast(html) {
    toastEl.innerHTML = html;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3000);
  }

  let modalResolve = null;
  function ask({ title, body, ok }) {
    modal.querySelector("#modal-title").textContent = title;
    modal.querySelector("#modal-body").textContent = body;
    modal.querySelector("#modal-ok").textContent = ok;
    modal.hidden = false;
    modal.querySelector("#modal-ok").focus();
    return new Promise((resolve) => (modalResolve = resolve));
  }

  function closeModal(result) {
    modal.hidden = true;
    if (modalResolve) modalResolve(result);
    modalResolve = null;
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.id === "modal-cancel") closeModal(false);
    if (e.target.id === "modal-ok") closeModal(true);
  });

  async function cashOutFlow(id) {
    const g = find(id);
    if (!g || S.isCashedOut(g)) return;
    if (S.isLocked(g)) {
      toast(`${icon("lock")} Locked. Save ${money(S.remainingCents(g))} more to cash out.`);
      return;
    }
    const amt = money(S.savedCents(g));
    const yes = await ask({
      title: `Cash out ${amt}?`,
      body: `This releases the money from the vault and closes "${g.name}".`,
      ok: `Cash out ${amt}`,
    });
    if (!yes) return;
    replaceGoal(S.cashOut(g));
    renderRoute();
    toast(`🎉 ${amt} cashed out. Nice saving!`);
  }

  async function deleteFlow(id) {
    const g = find(id);
    if (!g) return;
    if (!S.canDelete(g)) {
      toast(`${icon("lock")} This goal is holding money. Reach it and cash out before deleting.`);
      return;
    }
    const yes = await ask({ title: `Delete "${g.name}"?`, body: "This removes the goal and its history.", ok: "Delete goal" });
    if (!yes) return;
    goals = goals.filter((x) => x.id !== id);
    save();
    location.hash = "#/home";
  }

  function buySubmit() {
    const goal = find(draft.buyGoalId);
    const cents = keyedCents(draft.buyAmount);
    if (!goal || cents <= 0) return;
    try {
      const next = S.buyStack(goal, cents);
      replaceGoal(next);
      location.hash = `#/goal/${goal.id}`;
      if (S.isLocked(goal) && !S.isLocked(next)) {
        toast(`${icon("unlock")} Goal reached! "${esc(goal.name)}" is unlocked.`);
      } else {
        toast(`${icon("stack")} ${money(cents)} stack added to the vault.`);
      }
    } catch (err) {
      toast(esc(err.message));
    }
  }

  function newSubmit() {
    try {
      const goal = S.createGoal(draft.newName, keyedCents(draft.newAmount));
      goals = [goal, ...goals];
      save();
      location.hash = `#/goal/${goal.id}`;
      toast(`${icon("lock")} "${esc(goal.name)}" created and locked.`);
    } catch (err) {
      toast(esc(err.message));
    }
  }

  function handleKey(key) {
    if (app.dataset.screen === "buy" && draft.buyGoalId) {
      draft.buyAmount = pressKey(draft.buyAmount, key);
      updateBuy(false);
    } else if (app.dataset.screen === "new") {
      draft.newAmount = pressKey(draft.newAmount, key);
      updateNew();
    }
  }

  app.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    const { action } = el.dataset;

    if (action === "nav") location.hash = el.dataset.href;
    else if (action === "key") handleKey(el.dataset.key);
    else if (action === "pick-goal") {
      draft.buyGoalId = el.dataset.id;
      updateBuy(true);
    } else if (action === "quick") {
      const c = Number(el.dataset.cents);
      draft.buyAmount = c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2);
      updateBuy(false);
    } else if (action === "buy-submit") buySubmit();
    else if (action === "new-submit") newSubmit();
    else if (action === "cashout") cashOutFlow(el.dataset.id);
    else if (action === "delete") deleteFlow(el.dataset.id);
    else if (action === "buy-any") {
      if (openGoals().length) location.hash = "#/buy";
      else {
        location.hash = "#/new";
        toast("Create a goal first, then buy stacks toward it.");
      }
    } else if (action === "cashout-any") {
      const ready = openGoals().find(S.canCashOut);
      if (ready) location.hash = `#/goal/${ready.id}`;
      else toast(`${icon("lock")} Nothing to cash out yet. Every goal is still locked.`);
    } else if (action === "scroll") {
      document.getElementById(el.dataset.target).scrollIntoView({ behavior: "smooth" });
    }
  });

  screen.addEventListener("input", (e) => {
    if (e.target.id === "goal-name") {
      draft.newName = e.target.value;
      updateNew();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!modal.hidden) {
      if (e.key === "Escape") closeModal(false);
      return;
    }
    const kind = app.dataset.screen;
    if (kind !== "buy" && kind !== "new") return;
    if (e.target.id === "goal-name") {
      if (e.key === "Enter") e.target.blur();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) handleKey(e.key);
    else if (e.key === "." || e.key === ",") handleKey(".");
    else if (e.key === "Backspace") handleKey("back");
    else if (e.key === "Enter") {
      e.preventDefault();
      if (kind === "buy") buySubmit();
      else if (!screen.querySelector("#new-submit").disabled) newSubmit();
    } else return;
    e.preventDefault();
  });

  // Fill the tab bar icons.
  document.querySelectorAll(".tabbar [data-icon]").forEach((el) => {
    el.innerHTML = el.dataset.icon === "logo" ? logo() : icon(el.dataset.icon);
  });

  window.addEventListener("hashchange", renderRoute);
  renderRoute();
})();
