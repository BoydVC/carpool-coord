(() => {
  const DATA = window.__CARPOOLS__;
  if (!DATA || !DATA.kids) {
    document.body.innerHTML = "<p style='padding:2rem;font-family:system-ui'>Missing carpool data. Run build.py.</p>";
    return;
  }

  const STORE_KEY = "carpool-coord-v1";
  const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function startOfWeek(d = new Date()) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = x.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function weekKey(d) {
    const s = startOfWeek(d);
    const y = s.getFullYear();
    const m = String(s.getMonth() + 1).padStart(2, "0");
    const day = String(s.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function fmtWeekRange(wk) {
    const [y, m, d] = wk.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d + 6);
    const opts = { month: "short", day: "numeric" };
    const yOpts = { month: "short", day: "numeric", year: "numeric" };
    return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, yOpts)}`;
  }

  function todayDayKey() {
    const d = new Date().getDay();
    // convert Sun=0..Sat=6 to mon..sun
    return DAY_KEYS[d === 0 ? 6 : d - 1];
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  let store = loadStore();
  let currentWeek = weekKey(new Date());
  if (!store.weeks) store.weeks = {};

  function ensureWeek(wk) {
    if (!store.weeks[wk]) store.weeks[wk] = { slots: {} };
    if (!store.weeks[wk].slots) store.weeks[wk].slots = {};
    return store.weeks[wk];
  }

  function slotKey(standingId, dayKey) {
    return `${standingId}|${dayKey}`;
  }

  function driverById(id) {
    return (DATA.drivers || []).find((d) => d.id === id);
  }

  function kidById(id) {
    return DATA.kids.find((k) => k.id === id);
  }

  function getSlot(wk, standingId, dayKey) {
    const w = ensureWeek(wk);
    return w.slots[slotKey(standingId, dayKey)] || null;
  }

  function setSlot(wk, standingId, dayKey, patch) {
    const w = ensureWeek(wk);
    const k = slotKey(standingId, dayKey);
    const prev = w.slots[k] || {};
    const next = { ...prev, ...patch };
    if (!next.driver && !next.note) delete w.slots[k];
    else w.slots[k] = next;
    saveStore(store);
  }

  function defaultForStanding(s) {
    // Standing defaults that are fixed (Boyds pickup, Boyd Thu drive, etc.)
    // Never auto-assign grandparent/team-parent as settled.
    const d = driverById(s.defaultDriver);
    if (!d) return { driver: "tbd", example: false };
    if (d.needsConfirm) return { driver: d.id, example: true, needsConfirm: true };
    if (s.defaultDriver === "carpool") return { driver: "carpool", example: false };
    return { driver: s.defaultDriver, example: false };
  }

  function effectiveSlot(wk, standing, dayKey) {
    if (!standing.days.includes(dayKey)) return null;
    const saved = getSlot(wk, standing.id, dayKey);
    if (saved && saved.driver) {
      const drv = driverById(saved.driver);
      return {
        driver: saved.driver,
        note: saved.note || "",
        example: !!saved.example,
        needsConfirm: !!(drv && drv.needsConfirm),
      };
    }
    const def = defaultForStanding(standing);
    const drv = driverById(def.driver);
    return {
      driver: def.driver,
      note: standing.note || "",
      example: !!def.example,
      needsConfirm: !!(drv && drv.needsConfirm) || !!def.needsConfirm,
      isDefault: true,
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, "&#39;");
  }

  function driverOptions(selected) {
    return (DATA.drivers || [])
      .map((d) => {
        const label = d.needsConfirm ? `${d.label} ⚠` : d.label;
        return `<option value="${d.id}" ${d.id === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
      })
      .join("");
  }

  function rowsForKid(kid) {
    const standings = (DATA.standing || []).filter((s) => s.kid === kid.id);
    // Group by activity+place, then drop/pickup as separate rows
    return standings.map((s) => {
      const cells = DAY_KEYS.map((dk, i) => {
        const slot = effectiveSlot(currentWeek, s, dk);
        if (!slot) return `<td><span class="empty-day">·</span></td>`;
        const today = currentWeek === weekKey(new Date()) && dk === todayDayKey();
        const cls = [
          slot.needsConfirm ? "needs-confirm" : "",
          slot.example ? "example-fill" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const badges = [];
        if (slot.example) badges.push(`<span class="ex-label">EXAMPLE</span>`);
        if (slot.needsConfirm) badges.push(`<span class="badge needs">Needs confirm</span>`);
        return `<td class="${today ? "today-col" : ""}">
          <div class="cell">
            <select class="${cls}" data-slot="${s.id}|${dk}" aria-label="${escapeAttr(s.activity)} ${DAY_LABELS[i]} ${s.leg}">
              ${driverOptions(slot.driver)}
            </select>
            <div class="cell-meta">${badges.join("")}</div>
            <input class="note-input" data-note="${s.id}|${dk}" value="${escapeAttr(slot.note || "")}" placeholder="note…" title="Editable note">
          </div>
        </td>`;
      }).join("");
      return `<tr>
        <td class="act-col">
          <strong>${escapeHtml(s.activity)}</strong>
          <div class="hint" style="margin:0">${escapeHtml(s.place)}</div>
        </td>
        <td class="leg-col"><span class="badge ${s.leg}">${s.leg}</span></td>
        ${cells}
      </tr>`;
    });
  }

  function renderBoard() {
    const root = $("#boardRoot");
    if (!root) return;
    const todayKey = todayDayKey();
    const isThisWeek = currentWeek === weekKey(new Date());

    const dayHeads = DAY_KEYS.map((dk, i) => {
      const today = isThisWeek && dk === todayKey;
      return `<th class="${today ? "today-col" : ""}" title="${DAY_FULL[i]}">${DAY_LABELS[i]}</th>`;
    }).join("");

    root.innerHTML = DATA.kids
      .map((kid) => {
        const rows = rowsForKid(kid).join("");
        return `<div class="panel ${kid.id}">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Practice carpool</p>
              <h2>${kid.emoji} ${escapeHtml(kid.name)} <span style="font-weight:600;color:var(--muted);font-size:0.9rem">(${kid.short})</span></h2>
              <p class="teams">${(kid.teams || []).map(escapeHtml).join(" · ")}</p>
            </div>
          </div>
          <div class="grid-wrap">
            <table class="carpool-grid" aria-label="${kid.short} carpool grid">
              <thead>
                <tr>
                  <th class="act-col">Activity</th>
                  <th class="leg-col">Leg</th>
                  ${dayHeads}
                </tr>
              </thead>
              <tbody>${rows || `<tr><td colspan="9" class="hint">No standing legs</td></tr>`}</tbody>
            </table>
          </div>
        </div>`;
      })
      .join("");
  }

  function renderStanding() {
    const root = $("#standingRoot");
    if (!root) return;
    root.innerHTML = (DATA.standing || [])
      .map((s) => {
        const kid = kidById(s.kid);
        const days = s.days.map((d) => DAY_LABELS[DAY_KEYS.indexOf(d)]).join(", ");
        return `<div class="standing-card">
          <h3>${kid ? kid.emoji + " " : ""}${escapeHtml(s.activity)} · <span class="badge ${s.leg}">${s.leg}</span></h3>
          <p><strong>Days:</strong> ${escapeHtml(days)} · <strong>Place:</strong> ${escapeHtml(s.place)}</p>
          <p>${escapeHtml(s.note)}</p>
        </div>`;
      })
      .join("");
  }

  function renderPrint() {
    const wrap = $("#printSheets");
    if (!wrap) return;
    const dayHeads = DAY_LABELS.map((d) => `<th>${d}</th>`).join("");

    wrap.innerHTML = DATA.kids
      .map((kid) => {
        const standings = (DATA.standing || []).filter((s) => s.kid === kid.id);
        const rows = standings
          .map((s) => {
            const cells = DAY_KEYS.map((dk) => {
              const slot = effectiveSlot(currentWeek, s, dk);
              if (!slot) return `<td><span class="empty-day">·</span></td>`;
              const drv = driverById(slot.driver);
              const label = drv ? drv.label : slot.driver;
              const needs = slot.needsConfirm ? " needs" : "";
              const ex = slot.example ? ` <span class="ex-label">EXAMPLE</span>` : "";
              const conf = slot.needsConfirm ? ` <span class="badge needs">Needs confirm</span>` : "";
              return `<td>
                <span class="print-driver${needs}">${escapeHtml(label)}</span>${ex}${conf}
                ${slot.note ? `<span class="print-note">${escapeHtml(slot.note)}</span>` : ""}
              </td>`;
            }).join("");
            return `<tr>
              <td class="act-col"><strong>${escapeHtml(s.activity)}</strong><div class="hint" style="margin:0">${escapeHtml(s.place)}</div></td>
              <td class="leg-col"><span class="badge ${s.leg}">${s.leg}</span></td>
              ${cells}
            </tr>`;
          })
          .join("");

        return `<article class="sheet">
          <div class="sheet-head">
            <h2>${kid.emoji} ${escapeHtml(kid.name)} · practice carpool</h2>
            <div class="week-label">${fmtWeekRange(currentWeek)}</div>
          </div>
          <table class="carpool-grid">
            <thead><tr><th class="act-col">Activity</th><th class="leg-col">Leg</th>${dayHeads}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="sheet-foot">
            <span>Ask before Chris/Beth · Melody · team-parent</span>
            <span>Boyd fridge · TokenMax</span>
          </div>
        </article>`;
      })
      .join("");
  }

  function countNeedsConfirm() {
    let n = 0;
    for (const s of DATA.standing || []) {
      for (const dk of s.days) {
        const slot = effectiveSlot(currentWeek, s, dk);
        if (slot && slot.needsConfirm) n++;
      }
    }
    return n;
  }

  function updateChrome() {
    const pill = $("#weekPill");
    if (pill) pill.textContent = fmtWeekRange(currentWeek);
    const label = $("#weekLabel");
    if (label) label.textContent = fmtWeekRange(currentWeek);
    const foot = $("#footStat");
    if (foot) foot.textContent = `${countNeedsConfirm()} slots need confirm`;
  }

  function renderAll() {
    renderBoard();
    renderStanding();
    renderPrint();
    updateChrome();
  }

  function shiftWeek(delta) {
    if (delta === 0) {
      currentWeek = weekKey(new Date());
    } else {
      const [y, m, d] = currentWeek.split("-").map(Number);
      const s = new Date(y, m - 1, d + delta * 7);
      currentWeek = weekKey(s);
    }
    renderAll();
  }

  function loadExample() {
    const ex = DATA.exampleWeek;
    if (!ex || !ex.assignments) return;
    const w = ensureWeek(currentWeek);
    for (const [k, v] of Object.entries(ex.assignments)) {
      w.slots[k] = {
        driver: v.driver,
        note: v.note || "",
        example: v.example !== false,
      };
    }
    saveStore(store);
    renderAll();
    const hint = $("#aboutHint");
    if (hint) hint.textContent = "EXAMPLE fills loaded for this week — labeled clearly.";
  }

  const VIEWS = ["board", "standing", "print", "about"];

  function showView(name) {
    if (!VIEWS.includes(name)) name = "board";
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    $$(".tab").forEach((t) => {
      const on = t.dataset.view === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (name === "print") renderPrint();
    const hash = `#${name}`;
    if (location.hash !== hash) history.replaceState(null, "", hash);
    document.body.classList.toggle("print-mode", name === "print");
  }

  function routeFromHash() {
    const h = (location.hash || "#board").replace("#", "").toLowerCase();
    showView(VIEWS.includes(h) ? h : "board");
  }

  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (tab) {
      showView(tab.dataset.view);
      return;
    }
    const weekBtn = e.target.closest("[data-week]");
    if (weekBtn) {
      shiftWeek(Number(weekBtn.dataset.week));
      return;
    }
  });

  document.addEventListener("change", (e) => {
    const sel = e.target.closest("[data-slot]");
    if (sel) {
      const [sid, dk] = sel.dataset.slot.split("|");
      const drv = driverById(sel.value);
      const prev = getSlot(currentWeek, sid, dk) || {};
      setSlot(currentWeek, sid, dk, {
        driver: sel.value,
        note: prev.note || "",
        example: false, // user-chosen overrides EXAMPLE
        needsConfirm: !!(drv && drv.needsConfirm),
      });
      renderAll();
      return;
    }
  });

  document.addEventListener("change", (e) => {
    const note = e.target.closest("[data-note]");
    if (note) {
      const [sid, dk] = note.dataset.note.split("|");
      const prev = getSlot(currentWeek, sid, dk) || {};
      const standing = (DATA.standing || []).find((s) => s.id === sid);
      const eff = standing ? effectiveSlot(currentWeek, standing, dk) : null;
      setSlot(currentWeek, sid, dk, {
        driver: prev.driver || (eff && eff.driver) || "tbd",
        note: note.value,
        example: prev.example || false,
      });
      // don't full re-render on every note blur — keep focus; light chrome update
      updateChrome();
    }
  });

  // also save note on blur via input event debounce-ish
  document.addEventListener("input", (e) => {
    const note = e.target.closest("[data-note]");
    if (!note) return;
    const [sid, dk] = note.dataset.note.split("|");
    const prev = getSlot(currentWeek, sid, dk) || {};
    const standing = (DATA.standing || []).find((s) => s.id === sid);
    const eff = standing ? effectiveSlot(currentWeek, standing, dk) : null;
    setSlot(currentWeek, sid, dk, {
      driver: prev.driver || (eff && eff.driver) || "tbd",
      note: note.value,
      example: !!prev.example,
    });
  });

  $("#btnPrint")?.addEventListener("click", () => {
    showView("print");
    setTimeout(() => window.print(), 120);
  });
  $("#btnDoPrint")?.addEventListener("click", () => window.print());
  $("#btnLoadExample")?.addEventListener("click", loadExample);

  $("#btnExport")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `carpool-coord-save-${currentWeek}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    const hint = $("#aboutHint");
    if (hint) hint.textContent = "Save JSON downloaded.";
  });

  $("#btnReset")?.addEventListener("click", () => {
    if (!confirm(`Clear assignments for week ${fmtWeekRange(currentWeek)}?`)) return;
    delete store.weeks[currentWeek];
    saveStore(store);
    renderAll();
    const hint = $("#aboutHint");
    if (hint) hint.textContent = "This week reset to standing defaults.";
  });

  $("#btnResetAll")?.addEventListener("click", () => {
    if (!confirm("Reset ALL carpool data on this device?")) return;
    store = { weeks: {} };
    saveStore(store);
    renderAll();
    const hint = $("#aboutHint");
    if (hint) hint.textContent = "All data cleared.";
  });

  window.addEventListener("hashchange", routeFromHash);

  ensureWeek(currentWeek);
  // Auto-seed EXAMPLE on first visit so screenshots look filled
  if (!store.seededExample) {
    loadExample();
    store.seededExample = true;
    saveStore(store);
  }
  renderAll();
  routeFromHash();
})();
