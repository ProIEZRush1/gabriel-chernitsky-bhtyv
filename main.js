/* ===========================================================
   Gabriel Chernitsky — interacciones del sitio
   =========================================================== */
(function () {
  "use strict";

  /* ---- Menú móvil ---- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
    });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  /* ---- Reveal on scroll ---- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---- Contadores animados ---- */
  function initCounters() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;
    var run = function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      var decimals = (target % 1 !== 0) ? 1 : 0;
      var start = 0, dur = 1400, t0 = null;
      var step = function (ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var val = start + (target - start) * eased;
        el.textContent = val.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---- FAQ acordeón ---- */
  function initFaq() {
    document.querySelectorAll(".faq-item").forEach(function (item) {
      var q = item.querySelector(".faq-q");
      var a = item.querySelector(".faq-a");
      if (!q || !a) return;
      q.addEventListener("click", function () {
        var open = item.classList.contains("open");
        document.querySelectorAll(".faq-item.open").forEach(function (o) {
          o.classList.remove("open");
          o.querySelector(".faq-a").style.maxHeight = null;
        });
        if (!open) {
          item.classList.add("open");
          a.style.maxHeight = a.scrollHeight + "px";
        }
      });
    });
  }

  /* ---- Toggle de precios mensual/anual ---- */
  function initPricing() {
    var sw = document.querySelector(".switch");
    if (!sw) return;
    var lblM = document.querySelector("[data-lbl-month]");
    var lblY = document.querySelector("[data-lbl-year]");
    var apply = function (yearly) {
      sw.classList.toggle("year", yearly);
      if (lblM) lblM.classList.toggle("on", !yearly);
      if (lblY) lblY.classList.toggle("on", yearly);
      document.querySelectorAll("[data-month]").forEach(function (el) {
        var m = el.getAttribute("data-month");
        var y = el.getAttribute("data-year");
        el.textContent = yearly ? y : m;
      });
      document.querySelectorAll("[data-per]").forEach(function (el) {
        el.textContent = yearly ? "/mes · facturado anual" : "/mes";
      });
    };
    sw.addEventListener("click", function () { apply(!sw.classList.contains("year")); });
    apply(false);
  }

  /* ---- Formulario de contacto (demo, sin backend) ---- */
  function initForm() {
    var form = document.querySelector("#contact-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = form.querySelector(".form-msg");
      var name = (form.querySelector("[name=nombre]") || {}).value || "";
      if (msg) {
        msg.classList.add("ok");
        msg.textContent = "¡Gracias" + (name ? ", " + name.split(" ")[0] : "") +
          "! Recibimos tu solicitud. Un especialista te contactará en menos de 24 h.";
      }
      form.reset();
      if (msg) msg.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  /* ---- Año dinámico en footer ---- */
  function initYear() {
    document.querySelectorAll("[data-year-now]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initReveal();
    initCounters();
    initFaq();
    initPricing();
    initForm();
    initYear();
  });
})();
