/* ===========================================================
   Gabriel Chernitsky — Panel operativo (módulos funcionales)
   Seguros · Rentas · Auxiliar Bancario
   100% en el navegador con localStorage.  Diseño por Overcloud.
   =========================================================== */
(function () {
  "use strict";

  /* ---------------- Storage ---------------- */
  var NS = "gc_panel_";
  var DB = {
    polizas: "seg_polizas",
    cotiz: "seg_cotizaciones",
    agentes: "seg_agentes",
    rentas: "rentas",
    auxiliares: "aux_auxiliares",
    movs: "aux_movimientos"
  };
  function load(key) {
    try { return JSON.parse(localStorage.getItem(NS + key)) || []; }
    catch (e) { return []; }
  }
  function save(key, arr) { localStorage.setItem(NS + key, JSON.stringify(arr)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------------- Helpers ---------------- */
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };
  var moneyFmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });
  function money(n) { return moneyFmt.format(isFinite(n) ? n : 0); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtDate(d) {
    if (!d) return "—";
    var p = String(d).split("-");
    if (p.length === 3) return p[2] + "/" + p[1] + "/" + p[0];
    return d;
  }
  function todayStr() {
    var t = new Date(); var m = t.getMonth() + 1, d = t.getDate();
    return t.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (d < 10 ? "0" + d : d);
  }
  function daysBetween(aStr, bStr) {
    var a = new Date(aStr + "T00:00:00"), b = new Date(bStr + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }
  function formToObj(form) {
    var o = {}; new FormData(form).forEach(function (v, k) { o[k] = typeof v === "string" ? v.trim() : v; });
    return o;
  }
  function toast(msg, kind) {
    var t = $("#toast"); if (!t) return;
    t.textContent = msg; t.className = "toast show" + (kind ? " " + kind : "");
    clearTimeout(t._t); t._t = setTimeout(function () { t.className = "toast"; }, 2400);
  }
  function emptyRow(cols, msg) {
    return '<tr><td colspan="' + cols + '"><div class="empty"><div class="big">🗂️</div><p>' +
      esc(msg || "Sin registros todavía. Captura el primero arriba.") + '</p></div></td></tr>';
  }
  function matches(obj, q, fields) {
    if (!q) return true; q = q.toLowerCase();
    return fields.some(function (f) { return String(obj[f] || "").toLowerCase().indexOf(q) > -1; });
  }

  /* ---------------- Navegación entre módulos ---------------- */
  function showModule(name) {
    var valid = { seguros: 1, rentas: 1, auxiliar: 1 };
    if (!valid[name]) name = "seguros";
    $$(".module").forEach(function (m) { m.classList.remove("show"); });
    var mod = $("#mod-" + name); if (mod) mod.classList.add("show");
    $$(".side-link").forEach(function (l) { l.classList.toggle("active", l.getAttribute("data-go") === name); });
    if (location.hash.slice(1) !== name) history.replaceState(null, "", "#" + name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function initNavModules() {
    $$(".side-link").forEach(function (l) {
      l.addEventListener("click", function () { showModule(l.getAttribute("data-go")); });
    });
    window.addEventListener("hashchange", function () { showModule(location.hash.slice(1)); });
    showModule(location.hash.slice(1) || "seguros");
  }

  /* ---------------- Sub-tabs ---------------- */
  function initSubtabs() {
    $$(".subtab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var group = tab.closest(".module");
        var pane = tab.getAttribute("data-pane");
        $$(".subtab", group).forEach(function (t) { t.classList.remove("active"); });
        $$(".pane", group).forEach(function (p) { p.classList.remove("show"); });
        tab.classList.add("active");
        var el = $("#" + pane, group); if (el) el.classList.add("show");
      });
    });
  }

  /* ---------------- Proyectos compartidos (datalist + filtros) ---------------- */
  function allProjects() {
    var set = {};
    load(DB.rentas).forEach(function (r) { if (r.proyecto) set[r.proyecto] = 1; });
    load(DB.auxiliares).forEach(function (a) { if (a.proyecto) set[a.proyecto] = 1; });
    return Object.keys(set).sort();
  }
  function refreshProjects() {
    var projs = allProjects();
    var dl = $("#proyectos-list");
    if (dl) dl.innerHTML = projs.map(function (p) { return '<option value="' + esc(p) + '">'; }).join("");
    var sel = $("#ren-fproyecto");
    if (sel) {
      var cur = sel.value;
      sel.innerHTML = '<option value="">Todos los proyectos</option>' +
        projs.map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + "</option>"; }).join("");
      sel.value = cur;
    }
  }

  /* =========================================================
     MÓDULO SEGUROS
     ========================================================= */

  /* ---- Agentes ---- */
  function renderAgentSelects() {
    var ags = load(DB.agentes);
    var opts = '<option value="">— Sin asignar —</option>' +
      ags.map(function (a) { return '<option value="' + esc(a.id) + '">' + esc(a.nombre) + "</option>"; }).join("");
    var sel = $('#seg-pol-form [name=agente]');
    if (sel) { var cur = sel.value; sel.innerHTML = opts; sel.value = cur; }
  }
  function agentName(id) {
    var a = load(DB.agentes).filter(function (x) { return x.id === id; })[0];
    return a ? a.nombre : "—";
  }
  function renderAgentes() {
    var data = load(DB.agentes), polizas = load(DB.polizas);
    var q = ($("#seg-ag-search").value || "").trim();
    var rows = data.filter(function (a) { return matches(a, q, ["nombre", "email", "zona", "telefono"]); });
    var body = $("#seg-ag-body");
    if (!rows.length) { body.innerHTML = emptyRow(7, q ? "Sin coincidencias." : "Registra a tu primer agente de venta."); }
    else body.innerHTML = rows.map(function (a) {
      var cnt = polizas.filter(function (p) { return p.agente === a.id; }).length;
      return "<tr><td><strong>" + esc(a.nombre) + "</strong></td><td>" + esc(a.email || "—") +
        "</td><td>" + esc(a.telefono || "—") + "</td><td>" + esc(a.zona || "—") +
        "</td><td>" + (a.comision ? esc(a.comision) + "%" : "—") +
        '</td><td><span class="tag info">' + cnt + " póliza" + (cnt === 1 ? "" : "s") + "</span></td>" +
        '<td><span class="row-act"><button class="icon-btn" data-edit-ag="' + a.id + '" title="Editar">✏️</button>' +
        '<button class="icon-btn del" data-del-ag="' + a.id + '" title="Eliminar">🗑️</button></span></td></tr>';
    }).join("");
    $("#seg-c-ag").textContent = data.length;
  }

  /* ---- Pólizas ---- */
  function segKpis() {
    var p = load(DB.polizas);
    var activas = p.filter(function (x) { return x.estatus === "activa"; }).length;
    var primas = p.reduce(function (s, x) { return s + num(x.prima); }, 0);
    var suma = p.reduce(function (s, x) { return s + num(x.suma); }, 0);
    $("#seg-kpis").innerHTML =
      kpi("Pólizas totales", p.length, "", "") +
      kpi("Pólizas activas", activas, "ok", "") +
      kpi("Primas / mes", money(primas), "", "Ingreso recurrente") +
      kpi("Suma asegurada", money(suma), "", "Cobertura total");
  }
  var TIPO_LABEL = { inmueble: "🏢 Inmueble", auto: "🚗 Auto", medico: "⚕️ Médico" };
  function tipoTag(t) { return '<span class="tag t-' + t + '">' + (TIPO_LABEL[t] || t) + "</span>"; }
  function estatusTag(e) {
    var m = { activa: ["ok", "Activa"], pendiente: ["warn", "Pendiente"], vencida: ["due", "Vencida"] };
    var x = m[e] || ["muted", e]; return '<span class="tag ' + x[0] + '">' + x[1] + "</span>";
  }
  function renderPolizas() {
    var data = load(DB.polizas);
    var q = ($("#seg-pol-search").value || "").trim();
    var ft = $("#seg-pol-ftipo").value, fe = $("#seg-pol-festatus").value;
    var rows = data.filter(function (p) {
      return matches(p, q, ["asegurado", "objeto", "aseguradora", "beneficiario"]) &&
        (!ft || p.tipo === ft) && (!fe || p.estatus === fe);
    });
    var body = $("#seg-pol-body");
    if (!rows.length) { body.innerHTML = emptyRow(10, (q || ft || fe) ? "Sin coincidencias para el filtro." : "Registra tu primera póliza."); }
    else body.innerHTML = rows.map(function (p) {
      return "<tr><td>" + tipoTag(p.tipo) + "</td><td><strong>" + esc(p.asegurado) + "</strong></td><td>" +
        esc(p.objeto) + "</td><td>" + esc(p.beneficiario || "—") + "</td><td>" + esc(p.aseguradora || "—") +
        '</td><td class="num">' + money(num(p.suma)) + '</td><td class="num">' + money(num(p.prima)) +
        "</td><td>" + esc(p.agente ? agentName(p.agente) : "—") + "</td><td>" + estatusTag(p.estatus || "activa") +
        '</td><td><span class="row-act"><button class="icon-btn" data-edit-pol="' + p.id + '" title="Editar">✏️</button>' +
        '<button class="icon-btn del" data-del-pol="' + p.id + '" title="Eliminar">🗑️</button></span></td></tr>';
    }).join("");
    $("#seg-c-pol").textContent = data.length;
    segKpis();
  }

  /* ---- Cotizaciones ---- */
  function renderCotiz() {
    var data = load(DB.cotiz);
    var q = ($("#seg-cot-search").value || "").trim();
    var ft = $("#seg-cot-ftipo").value;
    var rows = data.filter(function (c) {
      return matches(c, q, ["prospecto", "aseguradora"]) && (!ft || c.tipo === ft);
    });
    var body = $("#seg-cot-body");
    if (!rows.length) { body.innerHTML = emptyRow(7, (q || ft) ? "Sin coincidencias." : "Captura cotizaciones para comparar."); }
    else body.innerHTML = rows.map(function (c) {
      return "<tr><td><strong>" + esc(c.prospecto) + "</strong></td><td>" + tipoTag(c.tipo || "inmueble") +
        "</td><td>" + esc(c.aseguradora) + '</td><td class="num">' + money(num(c.prima)) +
        '</td><td class="num">' + money(num(c.suma)) + "</td><td>" + (c.deducible ? esc(c.deducible) + "%" : "—") +
        '</td><td><span class="row-act"><button class="icon-btn" data-edit-cot="' + c.id + '" title="Editar">✏️</button>' +
        '<button class="icon-btn del" data-del-cot="' + c.id + '" title="Eliminar">🗑️</button></span></td></tr>';
    }).join("");

    // Comparador: ordenado por prima, mejor = menor prima
    var comp = $("#seg-cot-compare");
    var sorted = rows.slice().sort(function (a, b) { return num(a.prima) - num(b.prima); });
    if (!sorted.length) {
      comp.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="big">⚖️</div><p>Agrega al menos una cotización para compararlas.</p></div>';
    } else {
      var bestPrima = num(sorted[0].prima);
      comp.innerHTML = sorted.map(function (c) {
        var best = num(c.prima) === bestPrima && sorted.length > 1;
        return '<div class="cot-card' + (best ? " best" : "") + '"><h4>' + esc(c.aseguradora) + '</h4>' +
          '<div class="ins">' + esc(c.prospecto) + " · " + (TIPO_LABEL[c.tipo] || "—") + "</div>" +
          '<div class="prima">' + money(num(c.prima)) + ' <small>/ mes</small></div>' +
          "<ul><li><span>Suma asegurada</span><span>" + money(num(c.suma)) + "</span></li>" +
          "<li><span>Deducible</span><span>" + (c.deducible ? esc(c.deducible) + "%" : "—") + "</span></li>" +
          (c.cobertura ? "<li><span>Cobertura</span><span>" + esc(c.cobertura) + "</span></li>" : "") +
          "</ul></div>";
      }).join("");
    }
    $("#seg-c-cot").textContent = data.length;
  }

  /* =========================================================
     MÓDULO RENTAS  — cálculo automático de estatus y mora
     ========================================================= */
  function computeRenta(r) {
    var monto = num(r.monto), pagado = num(r.pagado), tasa = num(r.tasaMora);
    // días de atraso: si pagada se mide al día de pago, si no al día de hoy
    var refDate = (pagado >= monto && r.fechaPago) ? r.fechaPago : todayStr();
    var atraso = r.vence ? Math.max(0, daysBetween(r.vence, refDate)) : 0;
    var saldoBase = Math.max(0, monto - pagado);
    // interés moratorio mensual proporcional a días, solo sobre saldo pendiente
    var mora = (saldoBase > 0 && atraso > 0 && tasa > 0) ? saldoBase * (tasa / 100) * (atraso / 30) : 0;
    var saldo = saldoBase + mora;
    var estatus;
    if (saldoBase <= 0 && monto > 0) estatus = "pagada";
    else if (pagado > 0 && pagado < monto) estatus = (atraso > 0 ? "vencida" : "parcial");
    else estatus = (atraso > 0 ? "vencida" : "pendiente");
    if (estatus === "vencida" && pagado > 0) estatus = "vencida"; // sigue vencida si tiene atraso y saldo
    return { atraso: atraso, mora: mora, saldo: saldo, saldoBase: saldoBase, estatus: estatus };
  }
  function renEstatusTag(e) {
    var m = { pagada: ["ok", "Pagada"], parcial: ["warn", "Parcial"], pendiente: ["info", "Pendiente"], vencida: ["due", "Vencida"] };
    var x = m[e] || ["muted", e]; return '<span class="tag ' + x[0] + '">' + x[1] + "</span>";
  }
  function renKpis() {
    var data = load(DB.rentas);
    var generadas = 0, cobradas = 0, adeudo = 0, mora = 0, venc = 0;
    data.forEach(function (r) {
      var c = computeRenta(r);
      generadas += num(r.monto);
      cobradas += Math.min(num(r.pagado), num(r.monto));
      adeudo += c.saldo;
      mora += c.mora;
      if (c.estatus === "vencida") venc++;
    });
    $("#ren-kpis").innerHTML =
      kpi("Renta generada", money(generadas), "", data.length + " registro" + (data.length === 1 ? "" : "s")) +
      kpi("Cobrado", money(cobradas), "ok", "") +
      kpi("Adeudo + mora", money(adeudo), "due", money(mora) + " de interés") +
      kpi("Rentas vencidas", venc, venc ? "due" : "ok", "Requieren gestión");
  }
  function renderRentas() {
    var data = load(DB.rentas);
    var q = ($("#ren-search").value || "").trim();
    var fe = $("#ren-festatus").value, fp = $("#ren-fproyecto").value;
    var rows = data.map(function (r) { return { r: r, c: computeRenta(r) }; }).filter(function (o) {
      return matches(o.r, q, ["inquilino", "unidad", "proyecto", "periodo"]) &&
        (!fe || o.c.estatus === fe) && (!fp || o.r.proyecto === fp);
    });
    var body = $("#ren-body");
    if (!rows.length) { body.innerHTML = emptyRow(11, (q || fe || fp) ? "Sin coincidencias para el filtro." : "Registra tu primera renta. El estatus se calcula solo."); }
    else body.innerHTML = rows.map(function (o) {
      var r = o.r, c = o.c;
      return "<tr><td><strong>" + esc(r.inquilino) + "</strong></td><td>" + esc(r.unidad) +
        "</td><td>" + esc(r.proyecto || "—") + "</td><td>" + esc(r.periodo || "—") +
        "</td><td>" + fmtDate(r.vence) + (c.atraso > 0 && c.saldoBase > 0 ? ' <span class="tag due">+' + c.atraso + "d</span>" : "") +
        '</td><td class="num">' + money(num(r.monto)) + '</td><td class="num">' + money(num(r.pagado)) +
        '</td><td class="num">' + (c.mora > 0 ? money(c.mora) : "—") +
        '</td><td class="num">' + money(c.saldo) + "</td><td>" + renEstatusTag(c.estatus) +
        '</td><td><span class="row-act"><button class="icon-btn" data-edit-ren="' + r.id + '" title="Editar">✏️</button>' +
        '<button class="icon-btn del" data-del-ren="' + r.id + '" title="Eliminar">🗑️</button></span></td></tr>';
    }).join("");
    renKpis();
  }

  /* =========================================================
     MÓDULO AUXILIAR BANCARIO
     ========================================================= */
  function auxName(id) {
    var a = load(DB.auxiliares).filter(function (x) { return x.id === id; })[0];
    return a ? a.nombre : "—";
  }
  function auxProject(id) {
    var a = load(DB.auxiliares).filter(function (x) { return x.id === id; })[0];
    return a ? a.proyecto : "";
  }
  // saldo = saldoInicial + cobros - pagos - transferencias
  function auxBalance(id) {
    var a = load(DB.auxiliares).filter(function (x) { return x.id === id; })[0];
    if (!a) return 0;
    var bal = num(a.saldoInicial);
    load(DB.movs).forEach(function (m) {
      if (m.auxiliar !== id) return;
      if (m.tipo === "cobro") bal += num(m.monto);
      else bal -= num(m.monto); // pago / transferencia = salida
    });
    return bal;
  }
  function auxMovCount(id) { return load(DB.movs).filter(function (m) { return m.auxiliar === id; }).length; }

  function renderAuxSelects() {
    var ax = load(DB.auxiliares);
    var optsBase = ax.map(function (a) {
      return '<option value="' + esc(a.id) + '">' + esc(a.nombre) + (a.proyecto ? " · " + esc(a.proyecto) : "") + "</option>";
    }).join("");
    var sel = $("#aux-mv-auxsel");
    if (sel) { var cur = sel.value; sel.innerHTML = '<option value="">— Selecciona auxiliar —</option>' + optsBase; sel.value = cur; }
    var fil = $("#aux-mv-faux");
    if (fil) { var c2 = fil.value; fil.innerHTML = '<option value="">Todos los auxiliares</option>' + optsBase; fil.value = c2; }
  }
  function auxKpis() {
    var ax = load(DB.auxiliares), mv = load(DB.movs);
    var total = ax.reduce(function (s, a) { return s + auxBalance(a.id); }, 0);
    var cobros = mv.filter(function (m) { return m.tipo === "cobro"; }).reduce(function (s, m) { return s + num(m.monto); }, 0);
    var pagos = mv.filter(function (m) { return m.tipo !== "cobro"; }).reduce(function (s, m) { return s + num(m.monto); }, 0);
    $("#aux-kpis").innerHTML =
      kpi("Auxiliares", ax.length, "", "En " + new Set(ax.map(function (a) { return a.proyecto; })).size + " proyecto(s)") +
      kpi("Saldo consolidado", money(total), total >= 0 ? "ok" : "due", "") +
      kpi("Total cobrado", money(cobros), "ok", "Ingresos") +
      kpi("Pagos + transferencias", money(pagos), "due", "Egresos");
  }
  function renderAuxiliares() {
    var data = load(DB.auxiliares);
    var q = ($("#aux-ax-search").value || "").trim();
    var rows = data.filter(function (a) { return matches(a, q, ["nombre", "proyecto", "banco", "cuenta"]); });
    // balance cards
    var cards = $("#aux-bal-cards");
    if (!data.length) {
      cards.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="big">🏦</div><p>Crea tu primer auxiliar para empezar a registrar movimientos.</p></div>';
    } else {
      cards.innerHTML = data.map(function (a) {
        var bal = auxBalance(a.id);
        return '<div class="aux-bal"><div class="nm">' + esc(a.nombre) + '</div><div class="pr">' +
          esc(a.proyecto || "Sin proyecto") + (a.banco ? " · " + esc(a.banco) : "") + '</div>' +
          '<div class="bal ' + (bal >= 0 ? "pos" : "neg") + '">' + money(bal) + '</div>' +
          '<div class="mv">' + auxMovCount(a.id) + " movimiento(s)</div></div>";
      }).join("");
    }
    var body = $("#aux-ax-body");
    if (!rows.length) { body.innerHTML = emptyRow(8, q ? "Sin coincidencias." : "Crea tu primer auxiliar."); }
    else body.innerHTML = rows.map(function (a) {
      var bal = auxBalance(a.id);
      return "<tr><td><strong>" + esc(a.nombre) + "</strong></td><td>" + esc(a.proyecto || "—") +
        "</td><td>" + esc(a.banco || "—") + "</td><td>" + esc(a.cuenta || "—") +
        '</td><td class="num">' + money(num(a.saldoInicial)) + "</td><td>" + auxMovCount(a.id) +
        '</td><td class="num" style="color:' + (bal >= 0 ? "var(--accent-600)" : "var(--danger)") + '">' + money(bal) +
        '</td><td><span class="row-act"><button class="icon-btn" data-edit-ax="' + a.id + '" title="Editar">✏️</button>' +
        '<button class="icon-btn del" data-del-ax="' + a.id + '" title="Eliminar">🗑️</button></span></td></tr>';
    }).join("");
    $("#aux-c-ax").textContent = data.length;
    renderAuxSelects();
    auxKpis();
    refreshProjects();
  }
  var MOV_LABEL = { cobro: ["ok", "⬇️ Cobro"], pago: ["due", "⬆️ Pago"], transferencia: ["info", "🔁 Transferencia"] };
  function renderMovs() {
    var data = load(DB.movs);
    var q = ($("#aux-mv-search").value || "").trim();
    var fa = $("#aux-mv-faux").value, ft = $("#aux-mv-ftipo").value;
    var rows = data.filter(function (m) {
      return matches(m, q, ["concepto", "referencia"]) && (!fa || m.auxiliar === fa) && (!ft || m.tipo === ft);
    }).sort(function (a, b) { return (b.fecha || "").localeCompare(a.fecha || ""); });
    var body = $("#aux-mv-body");
    if (!rows.length) { body.innerHTML = emptyRow(9, (q || fa || ft) ? "Sin coincidencias." : "Registra tu primer movimiento (necesitas un auxiliar)."); }
    else body.innerHTML = rows.map(function (m) {
      var lab = MOV_LABEL[m.tipo] || ["muted", m.tipo];
      var ingreso = m.tipo === "cobro";
      return "<tr><td>" + fmtDate(m.fecha) + "</td><td>" + esc(auxName(m.auxiliar)) +
        "</td><td>" + esc(auxProject(m.auxiliar) || "—") + '</td><td><span class="tag ' + lab[0] + '">' + lab[1] + "</span></td><td>" +
        esc(m.concepto) + "</td><td>" + esc(m.referencia || "—") +
        '</td><td class="num" style="color:var(--danger)">' + (!ingreso ? money(num(m.monto)) : "—") +
        '</td><td class="num" style="color:var(--accent-600)">' + (ingreso ? money(num(m.monto)) : "—") +
        '</td><td><span class="row-act"><button class="icon-btn" data-edit-mv="' + m.id + '" title="Editar">✏️</button>' +
        '<button class="icon-btn del" data-del-mv="' + m.id + '" title="Eliminar">🗑️</button></span></td></tr>';
    }).join("");
    $("#aux-c-mv").textContent = data.length;
    auxKpis();
  }

  /* ---------------- KPI helper ---------------- */
  function kpi(k, v, cls, s) {
    return '<div class="kpi"><div class="k">' + esc(k) + '</div><div class="v ' + (cls || "") + '">' +
      v + '</div>' + (s ? '<div class="s">' + esc(s) + "</div>" : "") + "</div>";
  }

  /* =========================================================
     CRUD genérico: enlazar formulario + edición + borrado
     ========================================================= */
  function bindForm(opts) {
    // opts: { formId, dbKey, cancelId, titleId, addTitle, editTitle, onSave }
    var form = $("#" + opts.formId); if (!form) return;
    var cancel = opts.cancelId ? $("#" + opts.cancelId) : null;
    var title = opts.titleId ? $("#" + opts.titleId) : null;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var o = formToObj(form);
      var arr = load(opts.dbKey);
      if (o.id) {
        arr = arr.map(function (x) { return x.id === o.id ? Object.assign({}, x, o) : x; });
        toast("Registro actualizado", "ok");
      } else {
        o.id = uid();
        arr.push(o);
        toast("Registro guardado", "ok");
      }
      save(opts.dbKey, arr);
      resetForm();
      opts.onSave();
    });

    function resetForm() {
      form.reset();
      form.querySelector("[name=id]").value = "";
      if (cancel) cancel.style.display = "none";
      if (title) title.textContent = opts.addTitle;
    }
    form.addEventListener("reset", function () {
      setTimeout(function () { form.querySelector("[name=id]").value = ""; if (cancel) cancel.style.display = "none"; if (title) title.textContent = opts.addTitle; }, 0);
    });

    opts._edit = function (id) {
      var item = load(opts.dbKey).filter(function (x) { return x.id === id; })[0];
      if (!item) return;
      Object.keys(item).forEach(function (k) {
        var f = form.querySelector("[name=" + k + "]");
        if (f) f.value = item[k];
      });
      if (cancel) cancel.style.display = "";
      if (title) title.textContent = opts.editTitle;
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    return opts;
  }

  function bindDelete(attr, dbKey, label, after) {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[" + attr + "]");
      if (!btn) return;
      var id = btn.getAttribute(attr);
      if (!confirm("¿Eliminar este registro de " + label + "? Esta acción no se puede deshacer.")) return;
      save(dbKey, load(dbKey).filter(function (x) { return x.id !== id; }));
      toast("Registro eliminado", "del");
      after();
    });
  }
  function bindEdit(attr, editor) {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[" + attr + "]");
      if (!btn) return;
      editor(btn.getAttribute(attr));
    });
  }
  function liveSearch(ids, fn) {
    ids.forEach(function (id) {
      var el = $("#" + id); if (!el) return;
      el.addEventListener("input", fn);
      el.addEventListener("change", fn);
    });
  }

  /* ---------------- Datos de ejemplo ---------------- */
  function seedDemo() {
    if (!confirm("Se cargarán datos de ejemplo en los tres módulos (se conservan tus registros actuales). ¿Continuar?")) return;
    var ag1 = uid(), ag2 = uid();
    save(DB.agentes, load(DB.agentes).concat([
      { id: ag1, nombre: "Laura Méndez", email: "laura@correo.com", telefono: "55 1234 5678", zona: "CDMX Sur", comision: "12" },
      { id: ag2, nombre: "Carlos Rivas", email: "carlos@correo.com", telefono: "55 8765 4321", zona: "Estado de México", comision: "10" }
    ]));
    save(DB.polizas, load(DB.polizas).concat([
      { id: uid(), tipo: "inmueble", asegurado: "Residencial Las Torres", beneficiario: "Inmobiliaria Méndez", objeto: "Edificio Torre A, 24 deptos", aseguradora: "GNP", suma: "8500000", prima: "4200", agente: ag1, vigencia: "2027-01-15", estatus: "activa", condiciones: "Daños, incendio, RC. Deducible 2%." },
      { id: uid(), tipo: "auto", asegurado: "Jorge Ramírez", beneficiario: "", objeto: "Honda Civic 2022", aseguradora: "Qualitas", suma: "420000", prima: "850", agente: ag2, vigencia: "2026-09-30", estatus: "activa", condiciones: "Cobertura amplia." },
      { id: uid(), tipo: "medico", asegurado: "Ana Solís", beneficiario: "Familia Solís", objeto: "Plan médico familiar", aseguradora: "AXA", suma: "2000000", prima: "1900", agente: ag1, vigencia: "2026-12-01", estatus: "pendiente", condiciones: "Hospitalización y maternidad." }
    ]));
    save(DB.cotiz, load(DB.cotiz).concat([
      { id: uid(), prospecto: "Jorge Ramírez", tipo: "auto", aseguradora: "Qualitas", prima: "850", suma: "420000", deducible: "5", cobertura: "Amplia, asistencia vial" },
      { id: uid(), prospecto: "Jorge Ramírez", tipo: "auto", aseguradora: "GNP", prima: "910", suma: "420000", deducible: "5", cobertura: "Amplia plus" },
      { id: uid(), prospecto: "Jorge Ramírez", tipo: "auto", aseguradora: "AXA", prima: "1020", suma: "430000", deducible: "3", cobertura: "Amplia, auto sustituto" }
    ]));
    save(DB.rentas, load(DB.rentas).concat([
      { id: uid(), inquilino: "María Castillo", unidad: "Local 12", proyecto: "Plaza Vértice", periodo: "Junio 2026", monto: "18000", vence: "2026-06-05", pagado: "18000", fechaPago: "2026-06-03", tasaMora: "3" },
      { id: uid(), inquilino: "Jorge Ramírez", unidad: "Depto 7A", proyecto: "Residencial Las Torres", periodo: "Junio 2026", monto: "12500", vence: "2026-06-10", pagado: "0", fechaPago: "", tasaMora: "4" },
      { id: uid(), inquilino: "Pedro Lagos", unidad: "Depto 4B", proyecto: "Residencial Las Torres", periodo: "Junio 2026", monto: "12500", vence: "2026-06-20", pagado: "6000", fechaPago: "2026-06-18", tasaMora: "4" }
    ]));
    var ax1 = uid(), ax2 = uid();
    save(DB.auxiliares, load(DB.auxiliares).concat([
      { id: ax1, nombre: "Cuenta rentas BBVA", proyecto: "Residencial Las Torres", banco: "BBVA", cuenta: "**** 4521", saldoInicial: "50000" },
      { id: ax2, nombre: "Cuenta mantenimiento", proyecto: "Plaza Vértice", banco: "Santander", cuenta: "**** 8890", saldoInicial: "15000" }
    ]));
    save(DB.movs, load(DB.movs).concat([
      { id: uid(), auxiliar: ax1, tipo: "cobro", fecha: "2026-06-03", concepto: "Renta junio · Depto 4B", referencia: "TRX-1001", monto: "6000" },
      { id: uid(), auxiliar: ax1, tipo: "pago", fecha: "2026-06-08", concepto: "Pago jardinería", referencia: "CHQ-220", monto: "2500" },
      { id: uid(), auxiliar: ax2, tipo: "cobro", fecha: "2026-06-03", concepto: "Renta junio · Local 12", referencia: "TRX-1002", monto: "18000" },
      { id: uid(), auxiliar: ax2, tipo: "transferencia", fecha: "2026-06-12", concepto: "Traspaso a cuenta concentradora", referencia: "SPEI-77", monto: "10000" }
    ]));
    toast("Datos de ejemplo cargados", "ok");
    renderAll();
  }
  function resetAll() {
    if (!confirm("Esto BORRARÁ todos los registros de los tres módulos en este dispositivo. ¿Continuar?")) return;
    Object.keys(DB).forEach(function (k) { localStorage.removeItem(NS + DB[k]); });
    toast("Todos los datos fueron borrados", "del");
    renderAll();
  }

  /* ---------------- Render maestro ---------------- */
  function renderAll() {
    renderAgentSelects();
    renderPolizas();
    renderCotiz();
    renderAgentes();
    renderRentas();
    renderAuxiliares();
    renderMovs();
    refreshProjects();
  }

  /* ---------------- Init ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    if (!$("#mod-seguros")) return; // sólo en app.html

    initNavModules();
    initSubtabs();

    // default fechas de hoy en formularios de fecha relevantes
    var movFecha = $('#aux-mv-form [name=fecha]'); if (movFecha) movFecha.value = todayStr();

    // ---- Pólizas ----
    var polForm = bindForm({ formId: "seg-pol-form", dbKey: DB.polizas, cancelId: "seg-pol-cancel", titleId: "seg-pol-title", addTitle: "Registrar póliza / asegurado", editTitle: "Editar póliza", onSave: function () { renderPolizas(); renderAgentes(); } });
    bindEdit("data-edit-pol", function (id) { polForm._edit(id); });
    bindDelete("data-del-pol", DB.polizas, "Seguros", function () { renderPolizas(); renderAgentes(); });
    liveSearch(["seg-pol-search", "seg-pol-ftipo", "seg-pol-festatus"], renderPolizas);

    // ---- Cotizaciones ----
    var cotForm = bindForm({ formId: "seg-cot-form", dbKey: DB.cotiz, cancelId: "seg-cot-cancel", titleId: "seg-cot-title", addTitle: "Registrar cotización", editTitle: "Editar cotización", onSave: renderCotiz });
    bindEdit("data-edit-cot", function (id) { cotForm._edit(id); });
    bindDelete("data-del-cot", DB.cotiz, "Cotizaciones", renderCotiz);
    liveSearch(["seg-cot-search", "seg-cot-ftipo"], renderCotiz);

    // ---- Agentes ----
    var agForm = bindForm({ formId: "seg-ag-form", dbKey: DB.agentes, cancelId: "seg-ag-cancel", titleId: "seg-ag-title", addTitle: "Registrar agente de venta", editTitle: "Editar agente", onSave: function () { renderAgentes(); renderAgentSelects(); renderPolizas(); } });
    bindEdit("data-edit-ag", function (id) { agForm._edit(id); });
    bindDelete("data-del-ag", DB.agentes, "Agentes", function () { renderAgentes(); renderAgentSelects(); renderPolizas(); });
    liveSearch(["seg-ag-search"], renderAgentes);

    // ---- Rentas ----
    var renForm = bindForm({ formId: "ren-form", dbKey: DB.rentas, cancelId: "ren-cancel", titleId: "ren-title", addTitle: "Registrar renta", editTitle: "Editar renta", onSave: function () { renderRentas(); refreshProjects(); } });
    bindEdit("data-edit-ren", function (id) { renForm._edit(id); });
    bindDelete("data-del-ren", DB.rentas, "Rentas", function () { renderRentas(); refreshProjects(); });
    liveSearch(["ren-search", "ren-festatus", "ren-fproyecto"], renderRentas);

    // ---- Auxiliares ----
    var axForm = bindForm({ formId: "aux-ax-form", dbKey: DB.auxiliares, cancelId: "aux-ax-cancel", titleId: "aux-ax-title", addTitle: "Crear auxiliar", editTitle: "Editar auxiliar", onSave: function () { renderAuxiliares(); renderMovs(); } });
    bindEdit("data-edit-ax", function (id) { axForm._edit(id); });
    bindDelete("data-del-ax", DB.auxiliares, "Auxiliares", function () { renderAuxiliares(); renderMovs(); });
    liveSearch(["aux-ax-search"], renderAuxiliares);

    // ---- Movimientos ----
    var mvForm = bindForm({ formId: "aux-mv-form", dbKey: DB.movs, cancelId: "aux-mv-cancel", titleId: "aux-mv-title", addTitle: "Registrar movimiento", editTitle: "Editar movimiento", onSave: function () { renderMovs(); renderAuxiliares(); } });
    bindEdit("data-edit-mv", function (id) { mvForm._edit(id); });
    bindDelete("data-del-mv", DB.movs, "Movimientos", function () { renderMovs(); renderAuxiliares(); });
    liveSearch(["aux-mv-search", "aux-mv-faux", "aux-mv-ftipo"], renderMovs);

    // ---- Demo / reset ----
    var seed = $("#seed-demo"); if (seed) seed.addEventListener("click", seedDemo);
    var reset = $("#reset-all"); if (reset) reset.addEventListener("click", resetAll);

    renderAll();
  });
})();
