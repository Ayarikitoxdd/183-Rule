(() => {
  "use strict";

  const THRESHOLD = 183;
  const SCALE_DAYS = 366; // eje del track: año completo, sea o no bisiesto

  const periodsEl = document.getElementById("periods");
  const yearSelect = document.getElementById("year-select");
  const addBtn = document.getElementById("add-period");
  const totalDaysEl = document.getElementById("total-days");
  const progressFill = document.getElementById("progress-fill");
  const thresholdMark = document.getElementById("threshold-mark");
  const stampEl = document.getElementById("verdict-stamp");
  const detailEl = document.getElementById("verdict-detail");
  const rowTemplate = document.getElementById("row-template");

  let periods = [];
  let nextId = 1;

  function populateYears() {
    const current = new Date().getFullYear();
    for (let y = current + 1; y >= current - 4; y--) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = String(y);
      if (y === current) opt.selected = true;
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

  function renderRows() {
    periodsEl.innerHTML = "";
    periods.forEach((p, i) => {
      const node = rowTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.id = String(p.id);
      node.querySelector(".ledger-index").textContent = String(i + 1).padStart(2, "0");
      const startInput = node.querySelector('[data-field="start"]');
      const endInput = node.querySelector('[data-field="end"]');
      startInput.value = p.start;
      endInput.value = p.end;
      const removeBtn = node.querySelector(".remove-row");
      removeBtn.style.visibility = periods.length > 1 ? "visible" : "hidden";
      periodsEl.appendChild(node);
    });
  }

  function parseDateUTC(value) {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    return Date.UTC(y, m - 1, d);
  }

  function recalc() {
    const year = Number(yearSelect.value);
    const yearStart = Date.UTC(year, 0, 1);
    const yearEnd = Date.UTC(year, 11, 31);
    const dayMs = 86400000;

    const intervals = [];
    let hasInvalid = false;

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

      const start = parseDateUTC(p.start);
      const end = parseDateUTC(p.end);

      if (start === null || end === null) {
        rowDaysEl.textContent = "—";
        return;
      }

      if (start > end) {
        startInput.classList.add("invalid");
        endInput.classList.add("invalid");
        rowDaysEl.textContent = "revisa fechas";
        hasInvalid = true;
        return;
      }

      const clippedStart = Math.max(start, yearStart);
      const clippedEnd = Math.min(end, yearEnd);

      if (clippedStart > clippedEnd) {
        rowDaysEl.textContent = `0 días en ${year}`;
        return;
      }

      const rowDays = Math.round((clippedEnd - clippedStart) / dayMs) + 1;
      rowDaysEl.textContent = `${rowDays} ${rowDays === 1 ? "día" : "días"}`;
      intervals.push([clippedStart, clippedEnd]);
    });

    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const [s, e] of intervals) {
      const last = merged[merged.length - 1];
      if (last && s <= last[1] + dayMs) {
        last[1] = Math.max(last[1], e);
      } else {
        merged.push([s, e]);
      }
    }

    const total = merged.reduce((sum, [s, e]) => sum + Math.round((e - s) / dayMs) + 1, 0);

    totalDaysEl.textContent = String(total);

    const fillPct = Math.min(100, (total / SCALE_DAYS) * 100);
    progressFill.style.width = `${fillPct}%`;
    progressFill.classList.toggle("is-resident", total >= THRESHOLD);
    thresholdMark.style.left = `${(THRESHOLD / SCALE_DAYS) * 100}%`;

    const isResident = total >= THRESHOLD;
    stampEl.textContent = isResident ? "Residente fiscal" : "No residente";
    stampEl.classList.toggle("is-resident", isResident);
    stampEl.classList.toggle("is-not-resident", !isResident);

    if (hasInvalid) {
      detailEl.textContent = "Revisa las fechas marcadas: la salida no puede ser anterior a la entrada.";
    } else if (total === THRESHOLD) {
      detailEl.textContent = `Alcanzas justo el umbral de ${THRESHOLD} días en ${year}.`;
    } else if (isResident) {
      detailEl.textContent = `Superas el umbral en ${total - THRESHOLD} ${total - THRESHOLD === 1 ? "día" : "días"} sobre ${THRESHOLD}, contando ${year}.`;
    } else {
      detailEl.textContent = `Te faltan ${THRESHOLD - total} ${THRESHOLD - total === 1 ? "día" : "días"} para llegar a los ${THRESHOLD} en ${year}.`;
    }
  }

  periodsEl.addEventListener("input", (e) => {
    if (e.target.matches('[data-field="start"], [data-field="end"]')) recalc();
  });

  periodsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".remove-row");
    if (btn) {
      const row = btn.closest(".ledger-row");
      removePeriod(Number(row.dataset.id));
    }
  });

  addBtn.addEventListener("click", () => addPeriod());
  yearSelect.addEventListener("change", recalc);

  populateYears();
  addPeriod();
})();
