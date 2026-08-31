(() => {
  "use strict";

  const THRESHOLD = 183;
  const SCALE_DAYS = 366; // eje del track: año completo, sea o no bisiesto
  const DAY_MS = 86400000;
  const MIN_YEAR = 1900;
  const MAX_YEAR = new Date().getFullYear() + 5;
  const MIN_DATE = `${MIN_YEAR}-01-01`;
  const MAX_DATE = `${MAX_YEAR}-12-31`;
  const STORAGE_KEY = "regla183-state-v1";
  const MAX_RESTORED_PERIODS = 50;

  const periodsEl = document.getElementById("periods");
  const yearSelect = document.getElementById("year-select");
  const addBtn = document.getElementById("add-period");
  const resetBtn = document.getElementById("reset-periods");
  const totalDaysEl = document.getElementById("total-days");
  const progressFill = document.getElementById("progress-fill");
  const thresholdMark = document.getElementById("threshold-mark");
  const stampEl = document.getElementById("verdict-stamp");
  const detailEl = document.getElementById("verdict-detail");
  const overlapNoteEl = document.getElementById("verdict-overlap-note");
  const rowTemplate = document.getElementById("row-template");

  let periods = [];
  let nextId = 1;

  function isValidDateString(value) {
    if (typeof value !== "string") return false;
    const match = /^(\d{4,6})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const y = Number(match[1]);
    const mo = Number(match[2]);
    const d = Number(match[3]);
    if (y < MIN_YEAR || y > MAX_YEAR) return false;
    if (mo < 1 || mo > 12) return false;
    if (d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  }

  function parseDateUTC(value) {
    if (!isValidDateString(value)) return null;
    const [y, mo, d] = value.split("-").map(Number);
    return Date.UTC(y, mo - 1, d);
  }

  function saveState() {
    try {
      const state = {
        year: yearSelect.value,
        periods: periods.map((p) => ({ start: p.start, end: p.end })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* almacenamiento no disponible: la calculadora sigue funcionando sin persistencia */
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.periods)) return null;
      const cleanPeriods = parsed.periods
        .filter((p) => p && typeof p === "object")
        .map((p) => ({
          start: typeof p.start === "string" ? p.start : "",
          end: typeof p.end === "string" ? p.end : "",
        }))
        .slice(0, MAX_RESTORED_PERIODS);
      if (cleanPeriods.length === 0) return null;
      return {
        year: typeof parsed.year === "string" ? parsed.year : null,
        periods: cleanPeriods,
      };
    } catch (e) {
      return null;
    }
  }

  function populateYears(selectedValue) {
    const current = new Date().getFullYear();
    const target = selectedValue && Number.isFinite(Number(selectedValue)) ? Number(selectedValue) : current;
    yearSelect.innerHTML = "";
    for (let y = current + 1; y >= current - 4; y--) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      if (y === target) opt.selected = true;
      yearSelect.appendChild(opt);
    }
  }

  function addPeriod(start = "", end = "") {
    periods.push({ id: nextId++, start, end });
    renderRows();
    recalc();
  }

  function removePeriod(id) {
    periods = periods.filter((p) => p.id !== id);
    if (periods.length === 0) {
      addPeriod();
      return;
    }
    renderRows();
    recalc();
  }

  function resetAll() {
    periods = [{ id: nextId++, start: "", end: "" }];
    populateYears();
    renderRows();
    recalc();
  }

  function renderRows() {
    periodsEl.innerHTML = "";
    periods.forEach((p, i) => {
      const node = rowTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.id = String(p.id);
      node.setAttribute("aria-label", `Periodo ${i + 1}`);
      node.querySelector(".ledger-index").textContent = String(i + 1).padStart(2, "0");

      const startId = `period-${p.id}-start`;
      const endId = `period-${p.id}-end`;

      const startInput = node.querySelector('[data-field="start"]');
      const endInput = node.querySelector('[data-field="end"]');
      const startLabel = node.querySelector('[data-role="start-label"]');
      const endLabel = node.querySelector('[data-role="end-label"]');

      startLabel.setAttribute("for", startId);
      endLabel.setAttribute("for", endId);
      startInput.id = startId;
      endInput.id = endId;
      startInput.min = MIN_DATE;
      startInput.max = MAX_DATE;
      endInput.min = MIN_DATE;
      endInput.max = MAX_DATE;
      startInput.value = p.start;
      endInput.value = p.end;

      const removeBtn = node.querySelector(".remove-row");
      removeBtn.setAttribute("aria-label", `Eliminar periodo ${i + 1}`);
      removeBtn.disabled = periods.length <= 1;

      periodsEl.appendChild(node);
    });
  }

  function recalc() {
    const year = Number(yearSelect.value);
    const yearStart = Date.UTC(year, 0, 1);
    const yearEnd = Date.UTC(year, 11, 31);

    const intervals = [];
    let hasInvalid = false;
    let sumOfRowDays = 0;

    periodsEl.querySelectorAll(".ledger-row").forEach((row) => {
      const id = Number(row.dataset.id);
      const p = periods.find((x) => x.id === id);
      const startInput = row.querySelector('[data-field="start"]');
      const endInput = row.querySelector('[data-field="end"]');
      const rowDaysEl = row.querySelector(".row-days");

      p.start = startInput.value;
      p.end = endInput.value;

      startInput.classList.remove("invalid");
      endInput.classList.remove("invalid");
      rowDaysEl.classList.remove("is-invalid");

      if (!p.start && !p.end) {
        rowDaysEl.textContent = "—";
        return;
      }

      const startValid = p.start === "" || isValidDateString(p.start);
      const endValid = p.end === "" || isValidDateString(p.end);

      if (p.start && !startValid) startInput.classList.add("invalid");
      if (p.end && !endValid) endInput.classList.add("invalid");

      if (!p.start || !p.end) {
        rowDaysEl.textContent = "—";
        if ((p.start && !startValid) || (p.end && !endValid)) {
          rowDaysEl.textContent = "fecha no válida";
          rowDaysEl.classList.add("is-invalid");
          hasInvalid = true;
        }
        return;
      }

      if (!startValid || !endValid) {
        rowDaysEl.textContent = "fecha no válida";
        rowDaysEl.classList.add("is-invalid");
        hasInvalid = true;
        return;
      }

      const start = parseDateUTC(p.start);
      const end = parseDateUTC(p.end);

      if (start > end) {
        startInput.classList.add("invalid");
        endInput.classList.add("invalid");
        rowDaysEl.textContent = "salida antes de entrada";
        rowDaysEl.classList.add("is-invalid");
        hasInvalid = true;
        return;
      }

      const clippedStart = Math.max(start, yearStart);
      const clippedEnd = Math.min(end, yearEnd);

      if (clippedStart > clippedEnd) {
        rowDaysEl.textContent = `0 días en ${year}`;
        return;
      }

      const rowDays = Math.round((clippedEnd - clippedStart) / DAY_MS) + 1;
      rowDaysEl.textContent = `${rowDays} ${rowDays === 1 ? "día" : "días"}`;
      sumOfRowDays += rowDays;
      intervals.push([clippedStart, clippedEnd]);
    });

    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [s, e] of intervals) {
      const last = merged[merged.length - 1];
      if (last && s <= last[1] + DAY_MS) {
        last[1] = Math.max(last[1], e);
      } else {
        merged.push([s, e]);
      }
    }

    const total = merged.reduce((sum, [s, e]) => sum + Math.round((e - s) / DAY_MS) + 1, 0);
    const safeTotal = Number.isFinite(total) ? total : 0;

    totalDaysEl.textContent = String(safeTotal);

    const fillPct = Math.min(100, Math.max(0, (safeTotal / SCALE_DAYS) * 100));
    progressFill.style.width = `${fillPct}%`;
    progressFill.classList.toggle("is-resident", safeTotal >= THRESHOLD);
    thresholdMark.style.left = `${(THRESHOLD / SCALE_DAYS) * 100}%`;

    const isResident = safeTotal >= THRESHOLD;
    stampEl.textContent = isResident ? "Cumple el criterio de 183 días" : "No cumple el criterio de 183 días";
    stampEl.classList.toggle("is-resident", isResident);
    stampEl.classList.toggle("is-not-resident", !isResident);

    if (hasInvalid) {
      detailEl.textContent = "Revisa las fechas marcadas: hay alguna fecha que no existe, o la salida es anterior a la entrada.";
    } else if (safeTotal === THRESHOLD) {
      detailEl.textContent = `Llegas justo al umbral de ${THRESHOLD} días en ${year} para este criterio.`;
    } else if (isResident) {
      const diff = safeTotal - THRESHOLD;
      detailEl.textContent = `Superas el umbral en ${diff} ${diff === 1 ? "día" : "días"} sobre ${THRESHOLD}, contando ${year}.`;
    } else {
      const diff = THRESHOLD - safeTotal;
      detailEl.textContent = `Te faltan ${diff} ${diff === 1 ? "día" : "días"} para llegar a los ${THRESHOLD} en ${year}.`;
    }

    if (overlapNoteEl) {
      if (sumOfRowDays > safeTotal) {
        overlapNoteEl.textContent = `Algunos periodos se solapan entre sí: sin contar los días repetidos, el total real es ${safeTotal}.`;
        overlapNoteEl.hidden = false;
      } else {
        overlapNoteEl.hidden = true;
      }
    }

    saveState();
  }

  periodsEl.addEventListener("input", (e) => {
    if (e.target.matches('[data-field="start"], [data-field="end"]')) recalc();
  });

  periodsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-row");
    if (btn && !btn.disabled) {
      const row = btn.closest(".ledger-row");
      removePeriod(Number(row.dataset.id));
    }
  });

  addBtn.addEventListener("click", () => addPeriod());
  if (resetBtn) resetBtn.addEventListener("click", resetAll);
  yearSelect.addEventListener("change", recalc);

  const saved = loadState();
  if (saved) {
    populateYears(saved.year);
    periods = saved.periods.map((p) => ({ id: nextId++, start: p.start, end: p.end }));
  } else {
    populateYears();
    periods = [{ id: nextId++, start: "", end: "" }];
  }
  renderRows();
  recalc();
})();
