(() => {
  "use strict";

  /* ==========================================================================
     Asistente orientativo sobre la obligación de presentar el Modelo 720.
     Reglas basadas en la Sede Electrónica de la Agencia Tributaria (ver
     fuentes citadas en modelo-720.html). Fichero independiente de
     calculator.js: no comparte estado ni funciones con la calculadora de
     la regla de los 183 días.
     ========================================================================== */

  const THRESHOLD = 50000;
  const INCREASE_THRESHOLD = 20000;
  const CATEGORY_ORDER = ["cuentas", "valores", "inmuebles"];
  const CATEGORY_LABEL = {
    cuentas: "cuentas bancarias",
    valores: "valores, seguros o rentas",
    inmuebles: "inmuebles",
  };

  const root = document.getElementById("m720-wizard");
  if (!root) return;

  const stepEl = document.getElementById("m720-step");
  const progressEl = document.getElementById("m720-progress");
  const resultSection = document.getElementById("m720-result");
  const wizardSection = document.getElementById("m720-wizard-section");

  function freshCategoryState() {
    return { declaradaAntes: null, cancelada: null, valorAnterior: null, valorActual: null };
  }

  let state = {
    residente: null,
    impatriado: null,
    tieneBienes: null,
    categorias: [],
    compartido: null,
    presentoAntes: null,
    porCategoria: {
      cuentas: freshCategoryState(),
      valores: freshCategoryState(),
      inmuebles: freshCategoryState(),
    },
  };

  let history = []; // pila de step ids realmente mostrados, para "Atrás"

  function categoriasSeleccionadas() {
    return CATEGORY_ORDER.filter((c) => state.categorias.includes(c));
  }

  /** Determina qué pantalla toca mostrar a partir del estado actual. */
  function computeStep() {
    if (state.residente === null) return "residente";
    if (state.residente === "no") return "result";
    if (state.residente === "inseguro") return "result";
    if (state.impatriado === null) return "impatriado";
    if (state.impatriado === "si") return "result";
    if (state.tieneBienes === null) return "tieneBienes";
    if (state.tieneBienes === "no") return "result";
    if (state.categorias.length === 0) return "categorias";
    if (state.compartido === null) return "compartido";
    if (state.presentoAntes === null) return "presentoAntes";

    for (const cat of categoriasSeleccionadas()) {
      const c = state.porCategoria[cat];
      if (state.presentoAntes === "si") {
        if (c.declaradaAntes === null) return `declaradaAntes:${cat}`;
        if (c.declaradaAntes === "si") {
          if (c.cancelada === null) return `cancelada:${cat}`;
          if (c.cancelada === "no") {
            if (c.valorAnterior === null) return `valorAnterior:${cat}`;
            if (c.valorActual === null) return `valorActualIncremento:${cat}`;
          }
          continue;
        }
      }
      if (c.valorActual === null) return `valorActualInicial:${cat}`;
    }
    return "result";
  }

  function isNumericStep(stepId) {
    return (
      stepId.startsWith("valorAnterior:") ||
      stepId.startsWith("valorActualIncremento:") ||
      stepId.startsWith("valorActualInicial:")
    );
  }

  function catOf(stepId) {
    return stepId.includes(":") ? stepId.split(":")[1] : null;
  }

  /** Aplica una respuesta al estado para el step id dado. */
  function applyAnswer(stepId, value) {
    const cat = catOf(stepId);
    if (stepId === "residente") state.residente = value;
    else if (stepId === "impatriado") state.impatriado = value;
    else if (stepId === "tieneBienes") state.tieneBienes = value;
    else if (stepId === "compartido") state.compartido = value;
    else if (stepId === "presentoAntes") state.presentoAntes = value;
    else if (stepId.startsWith("declaradaAntes:")) state.porCategoria[cat].declaradaAntes = value;
    else if (stepId.startsWith("cancelada:")) state.porCategoria[cat].cancelada = value;
    else if (stepId.startsWith("valorAnterior:")) state.porCategoria[cat].valorAnterior = value;
    else if (stepId.startsWith("valorActualIncremento:")) state.porCategoria[cat].valorActual = value;
    else if (stepId.startsWith("valorActualInicial:")) state.porCategoria[cat].valorActual = value;
  }

  /** Deshace la respuesta guardada para un step id (usado al ir "Atrás"). */
  function clearAnswer(stepId) {
    const cat = catOf(stepId);
    if (stepId === "residente") state.residente = null;
    else if (stepId === "impatriado") state.impatriado = null;
    else if (stepId === "tieneBienes") state.tieneBienes = null;
    else if (stepId === "categorias") state.categorias = [];
    else if (stepId === "compartido") state.compartido = null;
    else if (stepId === "presentoAntes") state.presentoAntes = null;
    else if (stepId.startsWith("declaradaAntes:")) {
      state.porCategoria[cat].declaradaAntes = null;
      state.porCategoria[cat].cancelada = null;
      state.porCategoria[cat].valorAnterior = null;
      state.porCategoria[cat].valorActual = null;
    } else if (stepId.startsWith("cancelada:")) {
      state.porCategoria[cat].cancelada = null;
      state.porCategoria[cat].valorAnterior = null;
      state.porCategoria[cat].valorActual = null;
    } else if (stepId.startsWith("valorAnterior:")) {
      state.porCategoria[cat].valorAnterior = null;
      state.porCategoria[cat].valorActual = null;
    } else if (stepId.startsWith("valorActualIncremento:") || stepId.startsWith("valorActualInicial:")) {
      state.porCategoria[cat].valorActual = null;
    }
  }

  function fmtEUR(n) {
    return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(n));
  }

  /* ---- contenido de cada pregunta ---- */

  function stepContent(stepId) {
    const cat = catOf(stepId);
    const label = cat ? CATEGORY_LABEL[cat] : "";

    switch (true) {
      case stepId === "residente":
        return {
          question: "¿Eres residente fiscal en España?",
          help: "El Modelo 720 solo afecta a quienes son residentes fiscales en España. Si no lo eres, o no lo sabes con seguridad, te lo indicamos en el resultado.",
          type: "choice",
          options: [
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
            { value: "inseguro", label: "No estoy seguro" },
          ],
        };
      case stepId === "impatriado":
        return {
          question: "¿Estás acogido al régimen especial de trabajadores desplazados (art. 93 LIRPF, a veces llamado «ley Beckham»)?",
          help: "Este régimen excluye expresamente de la obligación de presentar el Modelo 720, también a tu cónyuge e hijos si están acogidos al mismo régimen.",
          type: "choice",
          options: [
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
          ],
        };
      case stepId === "tieneBienes":
        return {
          question: "¿Tienes cuentas, inversiones o inmuebles fuera de España?",
          help: "Hablamos de bienes situados en el extranjero: cuentas bancarias, valores o seguros, e inmuebles.",
          type: "choice",
          options: [
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
          ],
        };
      case stepId === "categorias":
        return {
          question: "¿Qué tipo de bienes tienes en el extranjero?",
          help: "Puedes marcar más de uno. El Modelo 720 trata cada tipo como un bloque independiente, con su propio umbral de 50.000 €.",
          type: "multi",
          options: [
            { value: "cuentas", label: "Cuentas bancarias" },
            { value: "valores", label: "Valores, seguros o rentas" },
            { value: "inmuebles", label: "Inmuebles" },
          ],
        };
      case stepId === "compartido":
        return {
          question: "¿Compartes la titularidad de alguno de estos bienes con otra persona?",
          help: "La cotitularidad tiene un cálculo especial: se basa en lo que pagaste tú por tu parte, no en el valor actual del bien. Si es tu caso, te lo señalamos en el resultado en vez de darte un cálculo exacto.",
          type: "choice",
          options: [
            { value: "si", label: "Sí" },
            { value: "no", label: "No, soy el único titular" },
          ],
        };
      case stepId === "presentoAntes":
        return {
          question: "¿Habías presentado el Modelo 720 en algún año anterior?",
          help: "Si ya presentaste declaraciones antes, las reglas para saber si toca volver a presentar son distintas de las de la primera vez.",
          type: "choice",
          options: [
            { value: "si", label: "Sí" },
            { value: "no", label: "No, sería la primera vez" },
          ],
        };
      case stepId.startsWith("declaradaAntes:"):
        return {
          question: `¿Ya habías declarado ${label} en una declaración anterior?`,
          help: "Puede que hayas presentado el modelo antes, pero solo para alguno de tus bienes.",
          type: "choice",
          options: [
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
          ],
        };
      case stepId.startsWith("cancelada:"):
        return {
          question: `¿Se ha cancelado, vendido o transmitido alguno de los bienes de ${label} que ya habías declarado, durante este año?`,
          help: "Cancelar o transmitir un bien ya declarado obliga a volver a presentar el modelo para ese bloque, aunque el valor no haya subido.",
          type: "choice",
          options: [
            { value: "si", label: "Sí" },
            { value: "no", label: "No" },
          ],
        };
      case stepId.startsWith("valorAnterior:"):
        return {
          question: `¿Cuál fue el valor conjunto de ${label} que declaraste la última vez?`,
          help: "El importe en euros que figuraba en tu última declaración para este bloque.",
          type: "number",
        };
      case stepId.startsWith("valorActualIncremento:"):
        return {
          question: `¿Cuál es aproximadamente el valor conjunto actual de ${label}?`,
          help: "Solo hace falta volver a declarar si el valor conjunto ha subido más de 20.000 € respecto a la última vez.",
          type: "number",
        };
      case stepId.startsWith("valorActualInicial:") && cat === "cuentas":
        return {
          question: "¿Cuál fue el saldo más alto que tuvieron tus cuentas en el extranjero cerca de fin de año?",
          help: "Cuenta el que sea más alto entre el saldo a 31 de diciembre y el saldo medio del último trimestre.",
          type: "number",
        };
      case stepId.startsWith("valorActualInicial:") && cat === "valores":
        return {
          question: "¿Cuál era el valor de tus valores, seguros o rentas en el extranjero a 31 de diciembre?",
          help: "Incluye acciones, fondos de inversión, seguros de vida y similares gestionados fuera de España.",
          type: "number",
        };
      case stepId.startsWith("valorActualInicial:") && cat === "inmuebles":
        return {
          question: "¿Cuál era el valor aproximado de tus inmuebles en el extranjero a 31 de diciembre?",
          help: "Si tienes más de uno, indica la suma de todos.",
          type: "number",
        };
      default:
        return null;
    }
  }

  /* ---- resultado ---- */

  function computeResult() {
    if (state.residente === "inseguro") {
      return { kind: "inseguro" };
    }
    if (state.residente === "no") {
      return { kind: "no-aplica", reason: "No eres residente fiscal en España, así que el Modelo 720 no te resulta aplicable." };
    }
    if (state.impatriado === "si") {
      return { kind: "exento", reason: "Al estar acogido al régimen especial de trabajadores desplazados (art. 93 LIRPF), no estás obligado a presentar el Modelo 720 mientras dure el régimen." };
    }
    if (state.tieneBienes === "no") {
      return { kind: "no-aplica", reason: "Según los datos introducidos, no tienes bienes o derechos en el extranjero que declarar." };
    }

    const detalles = [];
    let obligado = false;

    for (const cat of categoriasSeleccionadas()) {
      const c = state.porCategoria[cat];
      const label = CATEGORY_LABEL[cat];
      let flagged = false;
      let motivo = "";

      if (state.presentoAntes === "si" && c.declaradaAntes === "si") {
        if (c.cancelada === "si") {
          flagged = true;
          motivo = `se ha cancelado o transmitido un bien de ${label} que ya estaba declarado`;
        } else {
          const anterior = Number(c.valorAnterior) || 0;
          const actual = Number(c.valorActual) || 0;
          const incremento = actual - anterior;
          if (incremento > INCREASE_THRESHOLD) {
            flagged = true;
            motivo = `el valor conjunto ha subido ${fmtEUR(incremento)} € desde la última declaración (más de 20.000 €)`;
          } else {
            motivo = `el valor conjunto no ha subido más de 20.000 € desde la última declaración (${incremento >= 0 ? "+" : ""}${fmtEUR(incremento)} €)`;
          }
        }
      } else {
        const actual = Number(c.valorActual) || 0;
        if (actual > THRESHOLD) {
          flagged = true;
          motivo = `el valor (${fmtEUR(actual)} €) supera los 50.000 €`;
        } else {
          motivo = `el valor (${fmtEUR(actual)} €) no supera los 50.000 €`;
        }
      }

      if (flagged) obligado = true;
      detalles.push({ cat, label, flagged, motivo });
    }

    return {
      kind: obligado ? "obligado" : "no-obligado",
      detalles,
      compartido: state.compartido === "si",
    };
  }

  /* ---- render ---- */

  function render() {
    const stepId = computeStep();

    if (stepId === "result") {
      renderResult();
      return;
    }

    wizardSection.hidden = false;
    resultSection.hidden = true;

    const content = stepContent(stepId);
    if (!content) return;

    progressEl.textContent = `Pregunta ${history.length + 1}`;

    const isBack = history.length > 0;
    stepEl.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "wizard-step";

    const h2 = document.createElement("h2");
    h2.className = "wizard-question";
    h2.tabIndex = -1;
    h2.textContent = content.question;
    wrap.appendChild(h2);

    const help = document.createElement("p");
    help.className = "wizard-help";
    help.textContent = content.help;
    wrap.appendChild(help);

    let continueBtn = null;

    if (content.type === "choice") {
      const opts = document.createElement("div");
      opts.className = "wizard-options";
      opts.setAttribute("role", "group");
      content.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice-btn";
        btn.textContent = opt.label;
        btn.setAttribute("aria-pressed", "false");
        btn.addEventListener("click", () => {
          history.push(stepId);
          applyAnswer(stepId, opt.value);
          render();
        });
        opts.appendChild(btn);
      });
      wrap.appendChild(opts);
    } else if (content.type === "multi") {
      const opts = document.createElement("div");
      opts.className = "wizard-options";
      opts.setAttribute("role", "group");
      content.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice-btn";
        btn.textContent = opt.label;
        const selected = state.categorias.includes(opt.value);
        btn.setAttribute("aria-pressed", selected ? "true" : "false");
        btn.addEventListener("click", () => {
          const idx = state.categorias.indexOf(opt.value);
          if (idx === -1) state.categorias.push(opt.value);
          else state.categorias.splice(idx, 1);
          btn.setAttribute("aria-pressed", state.categorias.includes(opt.value) ? "true" : "false");
          continueBtn.disabled = state.categorias.length === 0;
        });
        opts.appendChild(btn);
      });
      wrap.appendChild(opts);

      const nav = document.createElement("div");
      nav.className = "wizard-nav";
      continueBtn = document.createElement("button");
      continueBtn.type = "button";
      continueBtn.className = "btn-add";
      continueBtn.textContent = "Continuar";
      continueBtn.disabled = state.categorias.length === 0;
      continueBtn.addEventListener("click", () => {
        history.push(stepId);
        render();
      });
      nav.appendChild(continueBtn);
      appendBackButton(nav, stepId, isBack);
      wrap.appendChild(nav);
    } else if (content.type === "number") {
      const field = document.createElement("div");
      field.className = "value-field";
      const inputRow = document.createElement("div");
      inputRow.className = "value-input-row";
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.inputMode = "decimal";
      input.className = "value-input";
      input.setAttribute("aria-label", content.question);
      input.placeholder = "0";
      inputRow.appendChild(input);
      const suffix = document.createElement("span");
      suffix.className = "value-input-suffix";
      suffix.textContent = "€";
      suffix.setAttribute("aria-hidden", "true");
      inputRow.appendChild(suffix);
      field.appendChild(inputRow);
      wrap.appendChild(field);

      const nav = document.createElement("div");
      nav.className = "wizard-nav";
      continueBtn = document.createElement("button");
      continueBtn.type = "button";
      continueBtn.className = "btn-add";
      continueBtn.textContent = "Continuar";
      continueBtn.disabled = true;

      function validate() {
        const v = input.value.trim();
        const n = Number(v);
        continueBtn.disabled = v === "" || !Number.isFinite(n) || n < 0;
      }
      input.addEventListener("input", validate);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !continueBtn.disabled) {
          e.preventDefault();
          continueBtn.click();
        }
      });

      continueBtn.addEventListener("click", () => {
        const n = Number(input.value);
        if (!Number.isFinite(n) || n < 0) return;
        history.push(stepId);
        applyAnswer(stepId, n);
        render();
      });
      nav.appendChild(continueBtn);
      appendBackButton(nav, stepId, isBack);
      wrap.appendChild(nav);

      window.setTimeout(() => input.focus(), 0);
    }

    if (content.type === "choice") {
      const nav = document.createElement("div");
      nav.className = "wizard-nav";
      appendBackButton(nav, stepId, isBack);
      if (nav.childElementCount > 0) wrap.appendChild(nav);
    }

    stepEl.appendChild(wrap);
    if (content.type !== "number") h2.focus();
  }

  function appendBackButton(nav, stepId, isBack) {
    if (!isBack) return;
    const back = document.createElement("button");
    back.type = "button";
    back.className = "btn-text";
    back.textContent = "← Atrás";
    back.addEventListener("click", () => {
      const prev = history.pop();
      if (prev !== undefined) clearAnswer(prev);
      render();
    });
    nav.insertBefore(back, nav.firstChild);
  }

  function renderResult() {
    wizardSection.hidden = true;
    resultSection.hidden = false;
    resultSection.innerHTML = "";

    const result = computeResult();
    const wrap = document.createElement("div");
    wrap.className = "wizard-step";

    if (result.kind === "inseguro") {
      const h2 = document.createElement("h2");
      h2.className = "wizard-question";
      h2.tabIndex = -1;
      h2.textContent = "Antes de seguir, conviene confirmar tu residencia fiscal";
      wrap.appendChild(h2);

      const p = document.createElement("p");
      p.className = "wizard-help";
      p.textContent = "El Modelo 720 solo obliga a residentes fiscales en España. Si no estás seguro, puedes comprobarlo con nuestra calculadora de la regla de los 183 días.";
      wrap.appendChild(p);

      const link = document.createElement("a");
      link.href = "regla-183.html";
      link.className = "cross-link";
      link.textContent = "→ Ir a la calculadora de residencia fiscal (Regla 183)";
      wrap.appendChild(link);

      const nav = document.createElement("div");
      nav.className = "wizard-nav";
      const cont = document.createElement("button");
      cont.type = "button";
      cont.className = "btn-add";
      cont.textContent = "Continuar suponiendo que sí soy residente";
      cont.addEventListener("click", () => {
        history.push("residente");
        state.residente = "si";
        render();
      });
      nav.appendChild(cont);
      appendBackButton(nav, "residente", true);
      wrap.appendChild(nav);

      resultSection.appendChild(wrap);
      h2.focus();
      return;
    }

    const isObligado = result.kind === "obligado";
    const stampClass = isObligado ? "stamp is-resident" : "stamp is-not-resident";
    const stampText = isObligado
      ? "Parece que existe obligación de presentar el Modelo 720"
      : result.kind === "exento"
      ? "No estás obligado a presentar el Modelo 720"
      : "No se aprecia obligación de presentar el Modelo 720";

    const resultHeading = document.createElement("h2");
    resultHeading.className = "wizard-question";
    resultHeading.tabIndex = -1;
    resultHeading.textContent = "Resultado";
    wrap.appendChild(resultHeading);

    const stamp = document.createElement("span");
    stamp.className = stampClass;
    const glyph = document.createElement("span");
    glyph.className = "stamp-glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = isObligado ? "✓" : "—";
    stamp.appendChild(glyph);
    const stampSpan = document.createElement("span");
    stampSpan.textContent = stampText;
    stamp.appendChild(stampSpan);
    wrap.appendChild(stamp);

    const detail = document.createElement("p");
    detail.className = "verdict-detail";
    if (result.reason) {
      detail.textContent = result.reason;
    } else if (isObligado) {
      detail.textContent = "Con los datos introducidos, al menos uno de los bloques parece superar el umbral que obliga a presentar el Modelo 720 (o corresponde a una cancelación/incremento que exige volver a declarar).";
    } else {
      detail.textContent = "Con los datos introducidos, ninguno de los bloques indicados parece superar el umbral aplicable.";
    }
    wrap.appendChild(detail);

    if (result.detalles && result.detalles.length) {
      const list = document.createElement("ul");
      list.className = "result-breakdown";
      result.detalles.forEach((d) => {
        const li = document.createElement("li");
        li.className = "result-item " + (d.flagged ? "is-flagged" : "is-clear");
        const icon = document.createElement("span");
        icon.className = "result-item-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = d.flagged ? "✓" : "–";
        li.appendChild(icon);
        const span = document.createElement("span");
        span.textContent = `${d.label.charAt(0).toUpperCase() + d.label.slice(1)}: ${d.motivo}.`;
        li.appendChild(span);
        list.appendChild(li);
      });
      wrap.appendChild(list);
    }

    if (result.compartido) {
      const callout = document.createElement("p");
      callout.className = "result-callout";
      callout.innerHTML =
        "<strong>Cotitularidad:</strong> como compartes la titularidad de algún bien, el umbral no se calcula como un simple porcentaje del valor actual — la Agencia Tributaria lo calcula a partir de lo que pagaste tú por tu parte, elevado al 100%. Esta herramienta no puede calcular eso por ti: confirma este punto con un asesor fiscal o con la Agencia Tributaria.";
      wrap.appendChild(callout);
    }

    const disclaimer = document.createElement("p");
    disclaimer.className = "result-callout";
    disclaimer.innerHTML =
      "Esta herramienta es <strong>orientativa</strong>. No sustituye el asesoramiento fiscal profesional ni tiene en cuenta el régimen foral de País Vasco y Navarra, las herencias yacentes, ni supuestos de cotitularidad con distinto coste de adquisición. Consulta la <a href=\"faq-modelo-720.html\">FAQ</a> más abajo para más contexto.";
    wrap.appendChild(disclaimer);

    const nav = document.createElement("div");
    nav.className = "wizard-nav";
    const restart = document.createElement("button");
    restart.type = "button";
    restart.className = "btn-text";
    restart.textContent = "Empezar de nuevo";
    restart.addEventListener("click", () => {
      state = {
        residente: null,
        impatriado: null,
        tieneBienes: null,
        categorias: [],
        compartido: null,
        presentoAntes: null,
        porCategoria: {
          cuentas: freshCategoryState(),
          valores: freshCategoryState(),
          inmuebles: freshCategoryState(),
        },
      };
      history = [];
      render();
    });
    nav.appendChild(restart);
    appendBackButton(nav, history[history.length - 1], history.length > 0);
    wrap.appendChild(nav);

    resultSection.appendChild(wrap);
    resultHeading.focus();
  }

  render();
})();
