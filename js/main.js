(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* If anything breaks, content stays visible (CSS keys off .js-ready) */
  window.addEventListener('error', function (e) {
    if (e && e.target && e.target !== window && e.target.tagName !== 'SCRIPT') return;
    doc.classList.remove('js-ready');
  });

  /* ---------- mobile menu ---------- */
  var btn = document.querySelector('.menu-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      var open = doc.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        doc.classList.remove('menu-open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { doc.classList.remove('menu-open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------- opening hours (Wagga Wagga = Australia/Sydney time) ---------- */
  var HOURS = { 0: null, 1: [8, 17], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: [8, 17], 6: [8, 12] };
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function fmt(h) { var s = h >= 12 ? 'pm' : 'am'; var x = h % 12 || 12; return x + ':00 ' + s; }
  function nowSydney() {
    try {
      var parts = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var m = {}; parts.forEach(function (p) { m[p.type] = p.value; });
      var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { d: map[m.weekday], h: parseInt(m.hour, 10) % 24, m: parseInt(m.minute, 10) };
    } catch (err) { var n = new Date(); return { d: n.getDay(), h: n.getHours(), m: n.getMinutes() }; }
  }
  function status() {
    var t = nowSydney(); var today = HOURS[t.d]; var mins = t.h * 60 + t.m;
    if (today && mins >= today[0] * 60 && mins < today[1] * 60) return { open: true, text: 'Open now · until ' + fmt(today[1]), day: t.d };
    if (today && mins < today[0] * 60) return { open: false, text: 'Closed · opens today ' + fmt(today[0]), day: t.d };
    for (var i = 1; i <= 7; i++) {
      var d = (t.d + i) % 7;
      if (HOURS[d]) return { open: false, text: 'Closed · opens ' + (i === 1 ? 'tomorrow' : DAYS[d]) + ' ' + fmt(HOURS[d][0]), day: t.d };
    }
    return { open: false, text: 'Closed', day: t.d };
  }
  var st = status();
  document.querySelectorAll('[data-open-badge]').forEach(function (el) {
    el.classList.add(st.open ? 'is-open' : 'is-closed');
    el.querySelector('span').textContent = st.text;
  });
  document.querySelectorAll('.hours tr[data-day]').forEach(function (tr) {
    if (parseInt(tr.getAttribute('data-day'), 10) === st.day) tr.classList.add('today');
  });

  /* ---------- scroll reveal (level 1) ---------- */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  doc.classList.add('js-ready');

  /* ---------- GSAP moments (level 2) ---------- */
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  /* wheel rolling along the header rail */
  var rail = document.querySelector('.rail');
  if (rail) {
    var bar = rail.querySelector('i'); var wheel = rail.querySelector('b');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var p = self.progress; var w = rail.clientWidth;
        bar.style.transform = 'scaleX(' + p + ')';
        wheel.style.transform = 'translateX(' + (p * w) + 'px) rotate(' + (p * w * 3.2) + 'deg)';
      }
    });
  }

  /* counters */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    if (reduce) { el.textContent = end.toFixed(dec); return; }
    var o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: function () {
        gsap.to(o, { v: end, duration: 1.6, ease: 'power3.out', onUpdate: function () { el.textContent = o.v.toFixed(dec); } });
      }
    });
  });

  var mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    /* hero: headline rises line by line, photo drifts slower than the page */
    var lines = document.querySelectorAll('.hero h1 .l > span');
    if (lines.length) {
      gsap.from(lines, { yPercent: 112, duration: 1.1, ease: 'power4.out', stagger: 0.12, delay: 0.1 });
      gsap.from('.hero .open-badge, .hero .lead, .hero .cta-row', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, delay: 0.55 });
      var himg = document.querySelector('.hero-img img');
      if (himg) gsap.to(himg, { yPercent: -7, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
  });

  /* recent fits: pinned horizontal scroll on wide screens, swipe on phones */
  mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', function () {
    var pin = document.querySelector('.fits-pin');
    var track = document.querySelector('.fits-track');
    if (!pin || !track) return;
    var dist = function () { return Math.max(0, track.scrollWidth - document.documentElement.clientWidth); };
    gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: { trigger: pin, start: 'center center', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 }
    });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
