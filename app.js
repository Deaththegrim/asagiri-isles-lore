/* Asagiri lorebook: data, routing, search, links, text. Pages are in pages.js, the bench in bench.js. */
(function () {
  "use strict";
  var App = window.App = {data: null, pages: {}, index: [], byId: {}};

  App.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c];
    });
  };
  App.h = function (html) { document.getElementById("main").innerHTML = html; };
  App.href = function (kind, id) { return kind + "/" + encodeURIComponent(id) + "/"; };
  /* the site's root path, from <base href> (every page carries one, so a link "people/x/" means the same on every page) */
  App.root = (function () {
    try { var u = new URL(document.baseURI); return typeof u.pathname === "string" ? u.pathname.replace(/[^/]*$/, "") : "/"; }
    catch (e) { return "/"; }
  })();
  /* the route: the path under the root, without slashes at the ends */
  App.path = function () {
    var p = decodeURIComponent(location.pathname);
    if (p.indexOf(App.root) === 0) p = p.slice(App.root.length);
    return p.replace(/index\.html$/, "").replace(/^\/+|\/+$/g, "");
  };
  App.param = function (k) { try { return new URLSearchParams(location.search).get(k) || ""; } catch (e) { return ""; } };
  App.go = function (url) { history.pushState(null, "", new URL(url, document.baseURI).href); route(); };
  App.img = function (url, alt, cls) {
    return url ? '<img loading="lazy" src="' + App.esc(url) + '" alt="' + App.esc(alt || "") + '"' + (cls ? ' class="' + cls + '"' : "") + ">" : "";
  };
  /* read (no value) or write a per-viewer value; a write answers whether the browser kept it */
  App.tryStore = function (k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null");
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (e) { return v === undefined ? null : false; }
  };

  /* sections: route key, data key, nav label, group */
  App.SECTIONS = [
    {k: "people", d: "npcs", label: "People", g: "World"},
    {k: "places", d: "locations", label: "Places", g: "World"},
    {k: "map", label: "Map", g: "World"},
    {k: "districts", label: "Districts", g: "World"},
    {k: "factions", d: "factions", label: "Factions", g: "World"},
    {k: "creatures", d: "creatures", label: "Creatures", g: "World"},
    {k: "lore", d: "lore", label: "Lore", g: "World"},
    {k: "mechanics", d: "books", label: "Mechanics", g: "Play"},
    {k: "say", d: "say", label: "What to say", g: "Play"},
    {k: "bench", label: "Crafting bench", g: "Play"},
    {k: "abilities", d: "abilities", label: "Abilities", g: "Play"},
    {k: "traits", d: "traits", label: "Traits", g: "Play"},
    {k: "skills", d: "skills", label: "Skills", g: "Play"},
    {k: "items", d: "items", label: "Items", g: "Play"},
    {k: "starts", d: "starts", label: "Story starts", g: "Play"},
    {k: "modes", d: "modes", label: "Game modes", g: "Play"},
    {k: "music", d: "music", label: "Music", g: "Extras"}
  ];
  var KIND = {npcs: "people", locations: "places", factions: "factions", creatures: "creatures", lore: "lore", books: "mechanics",
              abilities: "abilities", traits: "traits", skills: "skills", items: "items", starts: "starts", regions: "map"};
  App.KIND = KIND;
  var LABEL = {people: "Person", places: "Place", factions: "Faction", creatures: "Creature", lore: "Lore", mechanics: "Guide",
               abilities: "Ability", traits: "Trait", skills: "Skill", items: "Item", starts: "Story start", map: "Map"};

  /* how many entries a section lists: people once each, however many eras they have */
  App.count = function (d) {
    if (d !== "npcs") return App.data[d].length;
    var seen = {}; App.data.npcs.forEach(function (n) { seen[n.name] = 1; }); return Object.keys(seen).length;
  };

  /* the side nav is built once; a route only moves its current mark, so keyboard focus on a nav link survives */
  function buildNav() {
    var html = '<a href="./" data-k="">Home</a>', grp = "";
    App.SECTIONS.forEach(function (s) {
      if (s.g !== grp) { grp = s.g; html += '<div class="grp">' + grp + "</div>"; }
      var n = s.d && App.data[s.d] ? App.count(s.d) : "";
      html += '<a href="' + s.k + '/" data-k="' + s.k + '">' + s.label + (n ? "<span>" + n + "</span>" : "") + "</a>";
    });
    document.getElementById("side").innerHTML = html;
  }
  function nav(active) {
    document.querySelectorAll("#side a").forEach(function (a) {
      var on = a.dataset.k === active;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  /* ---------- search ---------- */
  function buildIndex() {
    Object.keys(KIND).forEach(function (d) {
      var seen = {};
      (App.data[d] || []).forEach(function (r) {
        var kind = KIND[d];
        App.byId[kind + "/" + r.id] = r;
        if (d === "npcs" && seen[r.name]) return;   // one result per person: the page switches between eras
        seen[r.name] = 1;
        App.index.push({kind: kind, id: r.id, name: r.name, n: r.name.toLowerCase(), img: r.img || null,
                        t: (r.name + " " + (r.type || "") + " " + (r.category || "") + " " + (r.info || "")).toLowerCase()});
      });
    });
  }
  App.search = function (q, limit) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    var words = q.split(/\s+/);
    var out = [];
    App.index.forEach(function (e) {
      var score = 0;
      if (e.n === q) score = 100;
      else if (e.n.indexOf(q) === 0) score = 60;
      else if (e.n.indexOf(q) > 0) score = 40;
      else if (words.every(function (w) { return e.n.indexOf(w) >= 0; })) score = 30;
      else if (words.every(function (w) { return e.t.indexOf(w) >= 0; })) score = 10;
      if (score) out.push({e: e, s: score + (e.kind === "people" || e.kind === "places" ? 2 : 0)});
    });
    out.sort(function (a, b) { return b.s - a.s || a.e.n.length - b.e.n.length; });
    return out.slice(0, limit || out.length).map(function (x) { return x.e; });
  };
  function resultsHtml(list) {
    return list.map(function (e, i) {
      return '<a role="option" id="opt' + i + '" aria-selected="' + (i === 0) + '" href="' + App.href(e.kind, e.id) + '"' + (i === 0 ? ' class="on"' : "") + ">" +
             (e.img ? App.img(e.img, "") : "") + "<span>" + App.esc(e.name) + '</span><span class="kind">' + LABEL[e.kind] + "</span></a>";
    }).join("");
  }
  function wireSearch() {
    var q = document.getElementById("q"), box = document.getElementById("results"), sel = 0;
    function open(on) {
      box.hidden = !on;
      q.setAttribute("aria-expanded", on ? "true" : "false");
      if (!on) q.removeAttribute("aria-activedescendant");
    }
    function mark(items) {
      items.forEach(function (a, i) { a.classList.toggle("on", i === sel); a.setAttribute("aria-selected", i === sel ? "true" : "false"); });
      if (items[sel]) q.setAttribute("aria-activedescendant", items[sel].id);
    }
    function show() {
      var list = App.search(q.value, 12);
      sel = 0;
      box.innerHTML = list.length ? resultsHtml(list) + '<a role="option" id="optall" aria-selected="false" href="search/?q=' +
        encodeURIComponent(q.value) + '"><span>All results for "' + App.esc(q.value) + '"</span></a>' :
        '<div role="option" aria-disabled="true" aria-selected="false" class="note" style="padding:8px 12px">Nothing found</div>';
      open(!!q.value.trim());
      mark(box.querySelectorAll("a[href]"));
    }
    q.addEventListener("input", show);
    q.addEventListener("keydown", function (ev) {
      var items = box.querySelectorAll("a[href]");
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        sel = Math.max(0, Math.min(items.length - 1, sel + (ev.key === "ArrowDown" ? 1 : -1)));
        mark(items);
      } else if (ev.key === "Enter") {
        if (!q.value.trim()) return;
        App.go(items[sel] ? items[sel].getAttribute("href") : "search/?q=" + encodeURIComponent(q.value));
        open(false);
      } else if (ev.key === "Escape") { open(false); }
    });
    document.addEventListener("click", function (ev) { if (!ev.target.closest(".search")) open(false); });
    document.querySelector(".search").addEventListener("focusout", function (ev) {
      if (!ev.relatedTarget || !ev.relatedTarget.closest(".search")) open(false);
    });
    box.addEventListener("click", function () { open(false); });
  }

  /* ---------- text: links + light markdown ---------- */
  var LINKER = null, LINKS = {};
  function buildLinker() {
    var names = [];
    [["npcs", "people"], ["locations", "places"], ["factions", "factions"], ["creatures", "creatures"]].forEach(function (p) {
      App.data[p[0]].forEach(function (r) {
        if (r.name.length >= 4 && !LINKS[r.name]) { LINKS[r.name] = App.href(p[1], r.id); names.push(r.name); }
      });
    });
    names.sort(function (a, b) { return b.length - a.length; });
    var alt = names.map(function (n) { return App.esc(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|");
    LINKER = new RegExp("(^|[^\\w'])(" + alt + ")(?![\\w])", "g");
  }
  App.link = function (escaped, self) {
    return escaped.replace(LINKER, function (m, pre, name) {
      var raw = name.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
      if (raw === self || !LINKS[raw]) return m;
      return pre + '<a href="' + LINKS[raw] + '">' + name + "</a>";
    });
  };
  /* the world's text: **bold**, "- " lists, blank-line paragraphs; names of public records become links */
  App.prose = function (text, self) {
    var blocks = String(text || "").split(/\n\s*\n/);
    return blocks.map(function (b) {
      var lines = b.split("\n");
      var inline = function (s) { return App.link(App.esc(s), self).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); };
      if (lines.every(function (l) { return /^\s*- /.test(l); })) {
        return "<ul>" + lines.map(function (l) { return "<li>" + inline(l.replace(/^\s*- /, "")) + "</li>"; }).join("") + "</ul>";
      }
      // runs of list lines become a <ul>, runs of other lines a <p>: a <ul> inside a <p> is split by the browser and the
      // text after it falls out of the paragraph (it lost the prose size on phones)
      var out = "", list = [], para = [];
      var flush = function () {
        if (para.length) { out += "<p>" + para.join("<br>") + "</p>"; para = []; }
        if (list.length) { out += "<ul>" + list.join("") + "</ul>"; list = []; }
      };
      lines.forEach(function (l) {
        if (/^\s*- /.test(l)) { if (para.length) flush(); list.push("<li>" + inline(l.replace(/^\s*- /, "")) + "</li>"); return; }
        if (list.length) flush();
        para.push(inline(l));
      });
      flush();
      return out;
    }).join("");
  };
  App.first = function (text, n) {
    var s = String(text || "").replace(/^\[[^\]]*\]\s*/, "").replace(/\*\*/g, "").split("\n")[0];
    return s.length > (n || 160) ? s.slice(0, n || 160).replace(/\s+\S*$/, "") + "..." : s;
  };

  /* list page helper: filters + a card grid with "show more" */
  App.listPage = function (opt) {
    var state = {q: "", f: {}, n: 120};
    Object.keys(opt.facet || {}).forEach(function (k) { if (App.param(k)) state.f[k] = App.param(k); });   // only this list's own filters
    function rows() {
      var q = state.q.toLowerCase();
      return opt.rows.filter(function (r) {
        for (var k in state.f) if (state.f[k] && String(opt.facet[k](r)) !== state.f[k]) return false;
        return !q || (r.name + " " + (r.info || "")).toLowerCase().indexOf(q) >= 0;
      });
    }
    function draw() {
      var list = rows();
      document.getElementById("grid").innerHTML = list.slice(0, state.n).map(opt.card).join("");
      document.getElementById("count").textContent = list.length + " of " + opt.rows.length;
      document.getElementById("more").hidden = list.length <= state.n;
    }
    var facets = Object.keys(opt.facet || {}).map(function (k) {
      var vals = {};
      opt.rows.forEach(function (r) { var v = opt.facet[k](r); if (v !== "" && v != null) vals[v] = 1; });
      var keys = Object.keys(vals).sort(opt.sorts && opt.sorts[k] || undefined);
      return '<select data-f="' + k + '" aria-label="' + (opt.names || {})[k] + '"><option value="">' + (opt.names || {})[k] + ": all</option>" +
        keys.map(function (v) { return '<option' + (state.f[k] === v ? " selected" : "") + ">" + App.esc(v) + "</option>"; }).join("") + "</select>";
    }).join("");
    App.h('<div class="crumbs"><a href="./">Home</a> / ' + opt.title + "</div><h1>" + opt.title + '</h1><p class="lede">' + opt.lede +
      '</p><div class="filters"><input type="search" id="lf" placeholder="Filter ' + opt.title.toLowerCase() + '..." aria-label="Filter ' + opt.title + '">' +
      facets + '<span class="count" id="count" aria-live="polite"></span></div><div class="grid' + (opt.wide ? " wide" : "") + '" id="grid"></div>' +
      '<button class="more" id="more">Show more</button>');
    document.getElementById("lf").addEventListener("input", function (e) { state.q = e.target.value; state.n = 120; draw(); });
    document.querySelectorAll("[data-f]").forEach(function (s) {
      s.addEventListener("change", function () { state.f[s.dataset.f] = s.value; state.n = 120; draw(); });
    });
    document.getElementById("more").addEventListener("click", function () { state.n += 240; draw(); });
    draw();
  };
  App.infobox = function (title, img, rows) {
    return '<aside class="infobox"><div class="hd">' + App.esc(title) + "</div>" + (img ? App.img(img, title) : "") + "<dl>" +
      rows.filter(function (r) { return r[1] !== "" && r[1] != null; }).map(function (r) {
        return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>";
      }).join("") + "</dl></aside>";
  };
  App.byName = function (dkey, name) {
    var list = App.data[dkey];
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    return null;
  };
  App.nameLink = function (dkey, name) {
    var r = App.byName(dkey, name);
    return r ? '<a href="' + App.href(KIND[dkey], r.id) + '">' + App.esc(name) + "</a>" : App.esc(name);
  };

  /* ---------- router ---------- */
  function route() {
    var parts = App.path().split("/");
    var key = parts[0] || "";
    nav(key);
    drawer(false);
    var page = App.pages[key] || App.pages[""];
    try { page(parts.slice(1).join("/")); }
    catch (e) { App.h("<h1>Something went wrong</h1><p class='note'>" + App.esc(e.message) + "</p>"); throw e; }
    if (!/^map/.test(key)) window.scrollTo(0, 0);
    document.title = (document.querySelector("main h1") || {}).textContent + " · Asagiri Lorebook";
    onThisPage();
    if (routed) document.getElementById("main").focus({preventScroll: true});   // the new page, not the top of the old one
    routed = true;
  }

  /* "On this page": a page with 3+ sections gets a sticky list of them beside it (Vector 2022's TOC; research/lorebook-layout.md).
     Existing nodes are MOVED into the layout, never re-rendered, so every listener a page set stays live. */
  var tocWatch = null;
  function onThisPage() {
    if (tocWatch) { tocWatch.disconnect(); tocWatch = null; }
    var main = document.getElementById("main");
    var heads = [].slice.call(main.querySelectorAll("h2"));
    if (heads.length < 3) return;
    var toc = document.createElement("nav");
    toc.className = "toc";
    toc.setAttribute("aria-label", "On this page");
    toc.innerHTML = "<b>On this page</b>" + heads.map(function (h, i) {
      h.id = "sec-" + i;
      var label = h.dataset.toc || h.textContent;   // a heading carrying chips names its own label
      return '<button type="button" data-sec="' + i + '"' + (h.classList.contains("cap") ? ' style="text-transform:capitalize"' : "") + ">" +
        App.esc(label) + "</button>";
    }).join("");
    toc.addEventListener("click", function (e) {
      var b = e.target.closest("[data-sec]"); if (!b) return;
      var h = document.getElementById("sec-" + b.dataset.sec);
      h.scrollIntoView({behavior: "smooth", block: "start"});
      h.setAttribute("tabindex", "-1"); h.focus({preventScroll: true});
    });
    var rail = document.createElement("div");
    rail.className = "rail";
    var box = main.querySelector(".article > .infobox");
    if (box) {
      box.parentNode.insertBefore(rail, box);
      rail.appendChild(box);
    } else {
      var grid = document.createElement("div"), col = document.createElement("div");
      grid.className = "tocgrid";
      var start = main.querySelector("h1");
      var nodes = [].slice.call(main.childNodes);
      var from = start ? nodes.indexOf(start) + 1 : 0;
      nodes.slice(from).forEach(function (n) { col.appendChild(n); });
      grid.appendChild(col); grid.appendChild(rail); main.appendChild(grid);
    }
    rail.appendChild(toc);
    if ("IntersectionObserver" in window) {
      tocWatch = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          toc.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b.dataset.sec === en.target.id.slice(4)); });
        });
      }, {rootMargin: "-20% 0px -70% 0px"});
      heads.forEach(function (h) { tocWatch.observe(h); });
    }
  }

  var top = document.createElement("button");
  top.className = "totop"; top.type = "button"; top.textContent = "Top"; top.hidden = true;
  top.setAttribute("aria-label", "Back to the top of the page");
  top.addEventListener("click", function () { window.scrollTo({top: 0, behavior: "smooth"}); document.getElementById("main").focus({preventScroll: true}); });
  document.body.appendChild(top);
  window.addEventListener("scroll", function () { top.hidden = window.scrollY < 900; }, {passive: true});
  var routed = false;

  function drawer(on) {
    document.getElementById("side").classList.toggle("open", on);
    document.getElementById("menu").setAttribute("aria-expanded", on ? "true" : "false");
  }
  document.getElementById("menu").addEventListener("click", function () { drawer(!document.getElementById("side").classList.contains("open")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") drawer(false); });
  document.getElementById("main").addEventListener("click", function () { drawer(false); });
  function topHeight() { document.documentElement.style.setProperty("--top-h", document.querySelector(".top").offsetHeight + "px"); }
  window.addEventListener("resize", topHeight);
  topHeight();
  fetch("data.json").then(function (r) {
    if (!r.ok) throw new Error("data.json answered " + r.status);
    return r.json();
  }).then(function (d) {
    App.data = d;
    buildIndex();
    buildLinker();
    buildNav();
    wireSearch();
    if (location.hash.indexOf("#/") === 0) {   // an old #/ link: the same page at its real address
      var old = location.hash.slice(2).split("?");
      history.replaceState(null, "", App.root + (old[0] ? old[0].replace(/\/?$/, "/") : "") + (old[1] ? "?" + old[1] : ""));
    }
    document.addEventListener("click", function (ev) {   // links inside the site route here, without a page load
      var a = ev.target.closest("a[href]");
      if (!a || a.target || ev.defaultPrevented || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      var u = new URL(a.href, document.baseURI);
      if (u.origin !== location.origin || u.pathname.indexOf(App.root) !== 0 || /\.[a-z0-9]+$/i.test(u.pathname)) return;
      ev.preventDefault();
      App.go(u.href);
    });
    window.addEventListener("popstate", route);
    route();
  }).catch(function (e) { App.h("<h1>Could not load the lorebook</h1><p class='note'>" + App.esc(e.message) + "</p>"); });
})();
