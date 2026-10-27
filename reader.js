/* Asagiri lorebook, the reader's own layer (his picks 2026-10-28, research/lorebook-improvements-2026-10-28.md): the after-the-war
   switch, previews of linked entries on hover, and "been there" marks on places. What a reader sets stays in their own browser
   (App.tryStore); nothing is sent anywhere. */
(function () {
  "use strict";
  var A = window.App, esc = A.esc;

  /* ---------- after the war: covered until the reader chooses to see it (spoiler practice: warn, cover, one switch) ---------- */
  var LATE_REGION = "The Asagiri Isles, After the War";
  var S = A.spoil = {key: "asagiri-lore:after-war", late: null};
  var opened = [];   // records shown once on their own page this visit ("Show this page")
  /* what is after the war: the post-war map and each post-war place's depths ("<post-war place> Depths"), their places, the people
     who live there, the quests given there, the lore entries named for it and the starts that open in it */
  S.init = function () {
    var d = A.data, late = new Set(), lateRegion = {}, latePlace = {};
    d.locations.forEach(function (l) { if (l.region === LATE_REGION) latePlace[l.name] = 1; });
    d.regions.forEach(function (r) {
      if (r.name === LATE_REGION || latePlace[r.name.replace(/ Depths$/, "")]) { lateRegion[r.name] = 1; late.add(r); }
    });
    d.locations.forEach(function (l) { if (lateRegion[l.region]) { latePlace[l.name] = 1; late.add(l); } });
    d.npcs.forEach(function (n) { if (latePlace[n.location]) late.add(n); });
    d.quests.forEach(function (q) { if (latePlace[q.place]) late.add(q); });
    d.lore.forEach(function (r) { if (/^After the (Great )?War\b/.test(r.name)) late.add(r); });
    d.starts.forEach(function (r) { if (/After the War/.test(r.info)) late.add(r); });
    S.late = late;
  };
  var fallback = null;   // the switch's value while the browser keeps nothing (private windows, blocked storage)
  S.shown = function () { return fallback !== null ? fallback : A.tryStore(S.key) === true; };
  S.hides = function (r) { return !!(r && S.late && S.late.has(r) && opened.indexOf(r) < 0 && !S.shown()); };
  S.set = function (show) {
    fallback = A.tryStore(S.key, show) ? null : show;
    var sw = document.getElementById("spoilsw"), note = document.getElementById("spoilnote");
    if (sw) sw.checked = S.shown();
    if (note) note.textContent = fallback === null ? "" : "This browser is not keeping settings: the switch lasts until you leave.";
    A.route();
  };
  /* a list's note: how many after-the-war entries it left out ("12 places after the war, hidden"), with the switch */
  S.listNote = function (n, what) {
    return n ? '<span class="note spoilnote">' + n + " " + esc(what) + ' after the war, hidden. <button type="button" class="linkish" data-spoil="show">Show them</button></span>' : "";
  };
  function veil(r, isMap) {
    var main = document.getElementById("main"), h1 = main.querySelector("h1");
    if (!h1) return;
    var box = document.createElement("div");
    box.className = "veil";
    box.setAttribute("role", "note");
    box.innerHTML = "<p><b>After the war.</b> " + (isMap ? "This map shows" : "This page is about") +
      " the isles after the Great War. Pages about what follows the war stay covered until you choose to see them.</p>" +
      '<p><button type="button" class="primary" data-spoil="page">Show this page</button> <button type="button" data-spoil="show">Show everything after the war</button></p>';
    // the rest of the page stays in it (search engines read it) but is covered and out of reach of the keyboard and screen readers
    [].slice.call(main.children).forEach(function (el) {
      if (el === h1 || el.classList.contains("crumbs")) return;
      el.classList.add("veiled");
      el.inert = true;
      el.setAttribute("aria-hidden", "true");
    });
    h1.insertAdjacentElement("afterend", box);
    S.veiled = r;
  }

  /* ---------- previews: a linked entry's picture and first line on hover, desktop only (Wikipedia's Page Previews) ---------- */
  var PV = {box: null, a: null, show: 0, hide: 0};
  A.preview = function (kind, r) {   // the card's html (pure: the gate runs it over every entry)
    var label = A.LABEL[kind] || "", sub = r.type || r.district || r.category || "";
    if (S.hides(r)) {
      return '<div class="pv-body"><div class="pv-k">' + esc(label) + " · after the war</div><div class=\"pv-t\">" + esc(r.name) +
        '</div><p>Covered: you have not chosen to see what follows the war.</p></div>';
    }
    var text = A.first(r.info, 220);
    return (r.img ? '<div class="pv-pic' + (kind === "people" ? " tall" : "") + '">' + A.img(r.img, "").replace('loading="lazy" ', "") + "</div>" : "") +
      '<div class="pv-body"><div class="pv-k">' +
      esc(label) + (sub && sub !== label ? " · " + esc(sub) : "") + '</div><div class="pv-t">' + esc(r.name) + "</div>" + (text ? "<p>" + esc(text) + "</p>" : "") + "</div>";
  };
  /* the entry a text link opens, or null: cards, tiles, the nav, search results, tabs and the preview itself already say enough */
  function entryOf(a) {
    if (!a || a.closest(".card, .tile, #preview, #side, .search, .toc, .tabs, .crumbs, .bannerlinks, .pop, .pin")) return null;
    var u;
    try { u = new URL(a.href, document.baseURI); } catch (e) { return null; }
    if (u.origin !== location.origin || u.search || u.pathname.indexOf(A.root) !== 0) return null;
    var m = decodeURIComponent(u.pathname.slice(A.root.length)).match(/^([a-z]+)\/([^/]+)\/$/);
    if (!m || m[1] === "map" || A.path() === m[1] + "/" + m[2]) return null;
    var r = A.byId[m[1] + "/" + m[2]];
    return r ? {kind: m[1], r: r} : null;
  }
  function place(a, y) {
    var rects = [].slice.call(a.getClientRects()), rc = rects[0];
    rects.forEach(function (x) { if (y != null && y >= x.top && y <= x.bottom) rc = x; });
    var box = PV.box, w = box.offsetWidth, h = box.offsetHeight, gap = 8;
    var left = Math.max(gap, Math.min(rc.left, window.innerWidth - w - gap));
    var top = rc.bottom + gap + h > window.innerHeight && rc.top - gap - h > 0 ? rc.top - gap - h : rc.bottom + gap;
    box.style.left = left + window.scrollX + "px";
    box.style.top = top + window.scrollY + "px";
  }
  function open(a, y) {
    var t = entryOf(a);
    if (!t) return;
    if (!PV.box) {
      PV.box = document.createElement("div");
      PV.box.id = "preview";
      PV.box.setAttribute("role", "tooltip");
      PV.box.hidden = true;
      PV.box.addEventListener("mouseenter", function () { clearTimeout(PV.hide); });
      PV.box.addEventListener("mouseleave", function () { later(close, 300); });
      document.body.appendChild(PV.box);
    }
    close();
    PV.a = a;
    PV.box.innerHTML = A.preview(t.kind, t.r);
    PV.box.hidden = false;
    place(a, y);
    a.setAttribute("aria-describedby", "preview");
  }
  function close() {
    clearTimeout(PV.show); clearTimeout(PV.hide);
    if (PV.box) PV.box.hidden = true;
    if (PV.a) PV.a.removeAttribute("aria-describedby");
    PV.a = null;
  }
  function later(fn, ms) { clearTimeout(PV.hide); PV.hide = setTimeout(fn, ms); }
  function wirePreviews() {
    if (!(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches)) return;   // phones: no previews
    document.addEventListener("mouseover", function (e) {
      var a = e.target.closest && e.target.closest("#main a[href]");
      if (!a || a === PV.a) { if (a) clearTimeout(PV.hide); return; }
      clearTimeout(PV.show);
      var y = e.clientY;
      PV.show = setTimeout(function () { open(a, y); }, 500);
    });
    document.addEventListener("mouseout", function (e) {
      var a = e.target.closest && e.target.closest("#main a[href]");
      if (!a) return;
      clearTimeout(PV.show);
      if (a === PV.a) later(close, 300);
    });
    document.addEventListener("focusin", function (e) {   // the keyboard gets the same preview on a focused link
      var a = e.target.closest && e.target.closest("#main a[href]");
      clearTimeout(PV.show);
      var keyed = false;
      try { keyed = !!a && a.matches(":focus-visible"); } catch (err) { keyed = false; }   // a browser without :focus-visible: no previews on focus
      if (keyed) PV.show = setTimeout(function () { open(a, null); }, 500);
      else if (PV.a) close();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && PV.a) close(); });
    document.addEventListener("click", close);
    window.addEventListener("scroll", function () { if (PV.a) close(); }, {passive: true});
  }

  /* ---------- been there: a reader's own marks on places, with progress per district (MapGenie's found-it marks) ---------- */
  var B = A.been = {key: "asagiri-lore:been", changed: null};
  var marks = null, kept = true;
  B.all = function () {
    if (!marks) { var v = A.tryStore(B.key); marks = v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
    return marks;
  };
  B.has = function (id) { return !!B.all()[id]; };
  B.count = function () { return Object.keys(B.all()).length; };
  B.toggle = function (id) {
    var v = B.all();
    if (v[id]) delete v[id]; else v[id] = 1;
    kept = A.tryStore(B.key, v);
    return !!v[id];
  };
  B.clear = function () { marks = {}; kept = A.tryStore(B.key, {}); };
  /* {district: [been, places]} over the given places */
  B.progress = function (places) {
    var v = B.all(), out = {};
    places.forEach(function (p) {
      if (!p.district) return;
      var o = out[p.district] = out[p.district] || [0, 0];
      o[1]++;
      if (v[p.id]) o[0]++;
    });
    return out;
  };
  B.button = function (p) {
    return '<button type="button" class="been" data-been="' + esc(p.id) + '" aria-pressed="' + B.has(p.id) + '">Been there</button>';
  };
  B.keptNote = function () { return kept === false ? '<span class="note">This browser is not keeping marks: they go when you leave.</span>' : ""; };

  /* ---------- wiring ---------- */
  A.reader = {
    init: function () {
      S.init();
      var side = document.getElementById("side"), lab = document.createElement("label");
      lab.className = "navsw";
      lab.innerHTML = '<input type="checkbox" id="spoilsw"' + (S.shown() ? " checked" : "") + "> Show after the war" +
        '<span class="note" id="spoilnote" aria-live="polite"></span>';
      side.appendChild(lab);
      document.getElementById("spoilsw").addEventListener("change", function () { S.set(this.checked); });
      document.addEventListener("click", function (e) {
        var s = e.target.closest("[data-spoil]");
        if (s) {
          e.preventDefault();
          if (s.dataset.spoil === "page" && S.veiled) { opened.push(S.veiled); A.route(); }
          else S.set(s.dataset.spoil === "show");
          return;
        }
        var b = e.target.closest("[data-been]");
        if (!b) return;
        var on = B.toggle(b.dataset.been);
        document.querySelectorAll('[data-been="' + b.dataset.been + '"]').forEach(function (x) { x.setAttribute("aria-pressed", on); });
        var k = document.getElementById("beenkept");
        if (k) k.innerHTML = B.keptNote();
        if (B.changed) B.changed(b.dataset.been);
      });
      window.addEventListener("storage", function (e) { if (e.key === B.key) marks = null; });   // marks made in another tab
      wirePreviews();
    },
    /* after every page draws: no preview left over, and an after-the-war page covered */
    routed: function (key, rest) {
      close();
      S.veiled = null;
      if (key === "map" && !rest) return;
      var r = A.byId[key + "/" + rest];
      if (S.hides(r)) veil(r, key === "map");
    }
  };
})();
