/* Asagiri lorebook pages: one renderer per section, list + entry. */
(function () {
  "use strict";
  var A = window.App, P = A.pages, esc = A.esc;
  var TIERS = ["weak", "average", "strong", "elite", "boss", "mythic"];

  function crumbs(parts) {
    return '<div class="crumbs"><a href="#/">Home</a>' + parts.map(function (p) {
      return " / " + (p[1] ? '<a href="' + p[1] + '">' + p[0] + "</a>" : esc(p[0]));
    }).join("") + "</div>";
  }
  function find(dkey, id) {
    var list = A.data[dkey];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function missing(what) { A.h(crumbs([[what]]) + "<h1>Not in the lorebook</h1><p class='lede'>Nothing by that name is known here.</p>"); }
  function card(kind, r, sub, land) {
    return '<a class="card" href="' + A.href(kind, r.id) + '">' + (r.img !== undefined ? '<div class="pic' + (land ? " land" : "") + '">' +
      A.img(r.img, r.name) + "</div>" : "") + '<div class="body"><div class="t">' + esc(r.name) + "</div>" +
      (sub ? '<div class="s">' + sub + "</div>" : "") + (land || r.img === undefined ? '<div class="x">' + esc(A.first(r.info)) + "</div>" : "") +
      "</div></a>";
  }
  function uniq(list) { var seen = {}; return list.filter(function (n) { return seen[n.name] ? false : (seen[n.name] = 1); }); }
  function copy(btn, text) {
    var done = function (msg) { btn.textContent = msg; setTimeout(function () { btn.textContent = "Copy"; }, 1500); };
    if (!navigator.clipboard) { done("Select and copy"); return; }
    navigator.clipboard.writeText(text).then(function () { done("Copied"); }, function () { done("Select and copy"); });
  }
  function districtLink(d) {
    return '<a href="#/districts/' + d.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + '">' + esc(d) + "</a>";
  }
  function levels(lv) { return lv && lv.length ? lv.join("-") : ""; }
  function regionOf(name) { return A.byName("regions", name); }
  function placeLink(name, area) {
    var p = A.byName("locations", name);
    if (!p) return esc(name || "");
    return '<a href="' + A.href("places", p.id) + '">' + esc(name) + "</a>" + (area ? ", " + esc(area) : "");
  }
  function era(region) {
    return region === "The Asagiri Isles, After the War" ? "After the war" : region === "The Otherworld" ? "Otherworld" :
      region === "The Asagiri Isles" ? "Before the war" : "Depths and isles";
  }

  /* ---------- home ---------- */
  P[""] = function () {
    var d = A.data, isles = regionOf("The Asagiri Isles");
    var tiles = [["people", A.count("npcs"), "people"], ["places", d.locations.length, "places"], ["districts", Object.keys(districtsAll()).length, "districts"], ["factions", d.factions.length, "factions"],
                 ["creatures", d.creatures.length, "creatures"], ["items", d.items.length, "items"], ["abilities", d.abilities.length, "abilities"],
                 ["traits", d.traits.length, "traits"], ["lore", d.lore.length, "lore entries"], ["mechanics", d.books.length, "guide books"],
                 ["say", d.say.length, "typed actions"], ["starts", d.starts.length, "story starts"], ["music", d.music.length, "tracks"]];
    var pick = d.npcs.filter(function (n) { return n.img; });
    var feat = pick.length ? pick[Math.floor(Math.random() * pick.length)] : null;
    A.h("<h1>The Asagiri Isles</h1>" + (isles ? '<div class="prose">' + A.prose(isles.info.replace(/^\[[^\]]*\]\s*/, "")) + "</div>" : "") +
      '<div class="tiles">' + tiles.map(function (t) { return '<a class="tile" href="#/' + t[0] + '"><b>' + t[1] + "</b><span>" + t[2] + "</span></a>"; }).join("") +
      "</div>" + (isles && isles.map ? '<h2>The map</h2><a class="hero" href="#/map/' + isles.id + '">' + A.img(isles.map, "The Asagiri Isles map") + "</a>" : "") +
      (feat ? "<h2>Someone you might meet</h2><div class='grid'>" + card("people", feat, esc(feat.type)) + "</div>" : "") +
      '<p class="note" style="margin-top:32px">Everything here is what a player can learn at the table: no one\'s secrets, no hidden places. ' +
      "Built from the world file; data " + esc(d.sha || "") + ".</p>");
  };

  /* ---------- people ---------- */
  P.people = function (id) {
    if (id) return person(id);
    var seen = {}, rows = A.data.npcs.filter(function (n) { return seen[n.name] ? false : (seen[n.name] = 1); });
    A.listPage({title: "People", rows: rows, lede: "Everyone the isles introduce you to, with where to find them. Someone the war changed has one page with both eras.",
      facet: {district: function (r) { var p = A.byName("locations", r.location); return p ? p.district : ""; },
              faction: function (r) { return r.faction; }, tier: function (r) { return r.tier; }, type: function (r) { return r.type; }},
      names: {district: "District", faction: "Faction", tier: "Tier", type: "Type"},
      sorts: {tier: function (a, b) { return TIERS.indexOf(a) - TIERS.indexOf(b); }},
      card: function (r) { return card("people", r, esc(r.type) + (r.level ? " · level " + r.level : "")); }});
  };
  function person(id) {
    var n = find("npcs", id);
    if (!n) return missing("People");
    var parts = n.info.split(/\n\s*\n/);
    var others = A.data.npcs.filter(function (o) { return o.location && o.location === n.location && o.id !== n.id; });
    var place = A.byName("locations", n.location);
    var versions = A.data.npcs.filter(function (o) { return o.name === n.name; });
    var vlabel = function (o) { var pl = A.byName("locations", o.location); return (pl ? era(pl.region) : "Elsewhere") + (o.epithet ? ": " + o.epithet : ""); };
    A.h(crumbs([["People", "#/people"], [n.name]]) + "<h1>" + esc(n.name) + "</h1>" + (n.epithet ? '<p class="lede">' + esc(n.epithet) + "</p>" : "") +
      (versions.length > 1 ? '<nav class="tabs" aria-label="Eras">' + versions.map(function (o) {
        return '<a href="' + A.href("people", o.id) + '"' + (o.id === n.id ? ' class="on" aria-current="page"' : "") + ">" + esc(vlabel(o)) + "</a>";
      }).join("") + "</nav>" : "") + '<div class="article"><div class="prose">' +
      A.prose(parts.join("\n\n"), n.name) +
      (n.personality.length ? "<h2>Personality</h2><ul>" + n.personality.map(function (l) {
        var m = l.split(/:\s*/); return "<li><strong>" + esc(m[0]) + ":</strong> " + esc(m.slice(1).join(": ")) + "</li>";
      }).join("") + "</ul>" : "") +
      (others.length ? "<h2>Also at " + esc(n.location) + "</h2><div class='grid'>" + others.slice(0, 18).map(function (o) {
        return card("people", o, esc(o.type));
      }).join("") + "</div>" : "") + "</div>" +
      A.infobox(n.name, n.img || (versions.filter(function (o) { return o.img; })[0] || {}).img, [["Type", esc(n.type)], ["Gender", esc(n.gender)], ["Tier", esc(n.tier)], ["Level", n.level],
        ["Faction", n.faction ? A.nameLink("factions", n.faction) : ""], ["Home", n.location ? placeLink(n.location, n.area) : ""],
        ["District", place && place.district ? districtLink(place.district) : ""], ["Era", place ? era(place.region) : ""],
        ["Map", place && regionOf(place.region) ? '<a href="#/map/' + regionOf(place.region).id + "?pin=" + place.id + '">Show on map</a>' : ""]]) +
      "</div>");
  }

  /* ---------- places ---------- */
  P.places = function (id) {
    if (id) return placePage(id);
    A.listPage({title: "Places", rows: A.data.locations, lede: "Towns, shrines, wilds and depths, before and after the war.",
      facet: {era: function (r) { return era(r.region); }, district: function (r) { return r.district; }, kind: function (r) { return r.kind; }},
      names: {era: "Era", district: "District", kind: "Kind"},
      card: function (r) { return card("places", r, esc(r.district || r.region) + (levels(r.levels) ? " · lv " + levels(r.levels) : ""), true); }});
  };
  function sayHere(name) {
    var out = [];
    A.data.say.forEach(function (f) {
      f.triggers.forEach(function (t) {
        if (t.where.some(function (w) { return w.split(": ").slice(1).join(": ") === name; }) || t.dests.indexOf(name) >= 0 && f.key === "route") {
          if (!out.some(function (o) { return o.f === f; })) out.push({f: f, t: t});
        }
      });
    });
    return out;
  }
  function placePage(id) {
    var p = find("locations", id);
    if (!p) return missing("Places");
    var people = A.data.npcs.filter(function (n) { return n.location === p.name; });
    var reg = regionOf(p.region), here = sayHere(p.name);
    A.h(crumbs([["Places", "#/places"], [p.name]]) + "<h1>" + esc(p.name) + '</h1><div class="article"><div class="prose">' +
      A.prose(p.info.replace(/^\[[^\]]*\]\s*/, ""), p.name) +
      (here.length ? "<h2>What you can do here</h2><ul>" + here.map(function (h) {
        return '<li><a href="#/say/' + h.f.key + '">' + esc(h.f.label) + "</a>" + (h.t.examples[0] ? ": <code>" + esc(h.t.examples[0]) + "</code>" : "") + "</li>";
      }).join("") + "</ul>" : "") +
      (p.areas.length ? "<h2>Areas</h2><div class='gallery'>" + p.areas.map(function (a) {
        return "<figure>" + (a.img ? A.img(a.img, a.name) : '<div class="noimg" role="img" aria-label="No picture yet"></div>') + "<figcaption><b>" + esc(a.name) + "</b>" + A.link(esc(a.text.split("\n")[0]), p.name) + "</figcaption></figure>";
      }).join("") + "</div>" : "") +
      (people.length ? "<h2>People here</h2><div class='grid'>" + people.map(function (n) { return card("people", n, esc(n.type)); }).join("") + "</div>" : "") +
      "</div>" + A.infobox(p.name, p.img, [["District", p.district ? districtLink(p.district) : ""], ["Region", esc(p.region)], ["Era", era(p.region)],
        ["Kind", esc(p.kind)], ["Levels", levels(p.levels)], ["Factions", p.factions.map(function (f) { return A.nameLink("factions", f); }).join(" · ")],
        ["Map", reg && reg.map ? '<a href="#/map/' + reg.id + "?pin=" + p.id + '">Show on map</a>' : ""]]) + "</div>");
  }

  /* ---------- map ---------- */
  P.map = function (id) {
    var regs = A.data.regions.filter(function (r) { return r.map && A.data.locations.some(function (l) { return l.region === r.name; }); });
    var reg = regs.filter(function (r) { return r.id === id; })[0] || regs.filter(function (r) { return r.name === "The Asagiri Isles"; })[0] || regs[0];
    var pinId = (location.hash.split("pin=")[1] || "").split("&")[0];
    var distPick = decodeURIComponent((location.hash.split("district=")[1] || "").split("&")[0]);
    var places = A.data.locations.filter(function (l) { return l.region === reg.name; });
    var dists = {}; places.forEach(function (p) { if (p.district) dists[p.district] = 1; });
    var main = ["The Asagiri Isles", "The Asagiri Isles, After the War", "The Otherworld"];
    var opts = regs.slice().sort(function (a, b) {
      var ia = main.indexOf(a.name), ib = main.indexOf(b.name);
      return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib) || a.name.localeCompare(b.name);
    });
    A.h(crumbs([["Map"]]) + "<h1>" + esc(reg.name) + '</h1><div class="mapbar"><select id="mreg" aria-label="Which map">' +
      opts.map(function (r) { return '<option value="' + r.id + '"' + (r === reg ? " selected" : "") + ">" + esc(r.name) + "</option>"; }).join("") +
      '</select><select id="mdist" aria-label="Show one district"><option value="">All districts</option>' +
      Object.keys(dists).sort().map(function (d) { return "<option>" + esc(d) + "</option>"; }).join("") +
      '</select><input id="mfind" type="search" placeholder="Find a place on this map" aria-label="Find a place" list="mlist"><datalist id="mlist">' +
      places.map(function (p) { return '<option value="' + esc(p.name) + '">'; }).join("") +
      '</datalist><label><input type="checkbox" id="mlbl"> Show labels</label><span class="count">' + places.length + " places</span></div>" +
      '<div class="map" id="map" tabindex="0" aria-label="Map of ' + esc(reg.name) + ': drag or arrow keys to pan, + and - to zoom; find a place with the box above">' +
      '<div class="stage" id="stage">' + A.img(reg.map, reg.name).replace('loading="lazy" ', "") +
      places.map(function (p) {
        return '<button class="pin ' + esc(p.kind) + '" tabindex="-1" data-id="' + p.id + '" style="left:' + (p.fx * 1000) + "px;top:" + (p.fy * 1000) +
          'px" aria-label="' + esc(p.name) + '"><span class="lbl" hidden>' + esc(p.name) + "</span></button>";
      }).join("") + '</div><div class="pop" id="pop" hidden role="dialog" aria-label="Place" tabindex="-1"></div><div class="zoom"><button id="zin" aria-label="Zoom in">+</button>' +
      '<button id="zout" aria-label="Zoom out">-</button><button id="zfit">Fit</button></div></div>');
    var map = document.getElementById("map"), stage = document.getElementById("stage"), pop = document.getElementById("pop");
    var v = {s: 1, x: 0, y: 0};
    function apply() {
      stage.style.transform = "translate(" + v.x + "px," + v.y + "px) scale(" + v.s + ")";
      stage.querySelectorAll(".pin").forEach(function (b) { b.style.transform = "translate(-50%, -50%) scale(" + (1 / v.s) + ")"; });
    }
    function fit() {
      var r = map.getBoundingClientRect();
      v.s = Math.min(r.width, r.height) / 1000; v.x = (r.width - 1000 * v.s) / 2; v.y = (r.height - 1000 * v.s) / 2; apply();
    }
    function zoom(f, cx, cy) {
      var r = map.getBoundingClientRect();
      cx = cx == null ? r.width / 2 : cx; cy = cy == null ? r.height / 2 : cy;
      var ns = Math.max(0.2, Math.min(8, v.s * f));
      v.x = cx - (cx - v.x) * ns / v.s; v.y = cy - (cy - v.y) * ns / v.s; v.s = ns; apply();
    }
    function focus(p) {
      var r = map.getBoundingClientRect();
      v.s = Math.max(v.s, 2.5); v.x = r.width / 2 - p.fx * 1000 * v.s; v.y = r.height / 2 - p.fy * 1000 * v.s; apply();
      stage.querySelectorAll(".pin").forEach(function (b) { b.classList.toggle("on", b.dataset.id === p.id); });
      var people = A.data.npcs.filter(function (n) { return n.location === p.name; });
      pop.hidden = false;
      pop.innerHTML = (p.img ? A.img(p.img, p.name) : "") + '<div class="body"><h3><a href="' + A.href("places", p.id) + '">' + esc(p.name) +
        "</a></h3><div class='note'>" + esc(p.district || "") + (levels(p.levels) ? " · level " + levels(p.levels) : "") + "</div><p>" +
        esc(A.first(p.info, 260)) + "</p>" + (people.length ? "<div class='note'>" + people.length + " people here</div>" : "") +
        '<button id="pclose">Close</button></div>';
      document.getElementById("pclose").onclick = closePop;
      if (keyed) pop.focus();
    }
    var keyed = false, lastFocus = null;
    function closePop() { pop.hidden = true; if (lastFocus) lastFocus.focus(); }
    map.addEventListener("keydown", function (e) {
      var step = 60;
      if (e.key === "Escape" && !pop.hidden) { e.preventDefault(); closePop(); return; }
      if (e.target.closest("input, select, .pop")) return;
      var d = {ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step]}[e.key];
      if (d) { e.preventDefault(); v.x += d[0]; v.y += d[1]; apply(); }
      else if (e.key === "+" || e.key === "=") zoom(1.4); else if (e.key === "-") zoom(1 / 1.4);
    });
    map.addEventListener("scroll", function () { map.scrollLeft = 0; map.scrollTop = 0; });
    var drag = null, touches = {}, pinch = null;
    map.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".pin, .pop, .zoom")) return;
      touches[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(touches);
      if (ids.length === 2) {   // two fingers: pinch to zoom around their midpoint
        var a = touches[ids[0]], b = touches[ids[1]];
        pinch = {d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: v.s}; drag = null;
      } else { drag = {x: e.clientX - v.x, y: e.clientY - v.y}; }
      map.classList.add("drag"); map.setPointerCapture(e.pointerId);
    });
    map.addEventListener("pointermove", function (e) {
      if (touches[e.pointerId]) touches[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(touches);
      if (pinch && ids.length === 2) {
        var a = touches[ids[0]], b = touches[ids[1]], r = map.getBoundingClientRect();
        zoom(pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d / v.s, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
      } else if (drag) { v.x = e.clientX - drag.x; v.y = e.clientY - drag.y; apply(); }
    });
    function lift(e) { delete touches[e.pointerId]; pinch = null; drag = null; map.classList.remove("drag"); }
    map.addEventListener("pointerup", lift);
    map.addEventListener("pointercancel", lift);
    map.addEventListener("wheel", function (e) {
      e.preventDefault(); var r = map.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top);
    }, {passive: false});
    stage.addEventListener("click", function (e) {
      var b = e.target.closest(".pin"); if (!b) return;
      keyed = false; lastFocus = null;
      focus(places.filter(function (p) { return p.id === b.dataset.id; })[0]);
    });
    document.getElementById("zin").onclick = function () { zoom(1.4); };
    document.getElementById("zout").onclick = function () { zoom(1 / 1.4); };
    document.getElementById("zfit").onclick = fit;
    document.getElementById("mreg").onchange = function () { location.hash = "#/map/" + this.value; };
    document.getElementById("mdist").onchange = function () {
      var d = this.value;
      stage.querySelectorAll(".pin").forEach(function (b) {
        var p = places.filter(function (x) { return x.id === b.dataset.id; })[0];
        b.classList.toggle("dim", !!d && p.district !== d);
      });
    };
    document.getElementById("mlbl").onchange = function () {
      var on = this.checked; stage.querySelectorAll(".lbl").forEach(function (l) { l.hidden = !on; });
    };
    document.getElementById("mfind").onchange = function () {
      var p = A.byName("locations", this.value);
      if (p && p.region === reg.name) { keyed = true; lastFocus = this; focus(p); }
    };
    fit();
    if (distPick && dists[distPick]) { document.getElementById("mdist").value = distPick; document.getElementById("mdist").onchange(); }
    var start = places.filter(function (p) { return p.id === pinId; })[0];
    if (start) focus(start);
  };

  /* ---------- factions ---------- */
  P.factions = function (id) {
    if (id) {
      var f = find("factions", id);
      if (!f) return missing("Factions");
      var members = uniq(A.data.npcs.filter(function (n) { return n.faction === f.name; }));
      var seats = A.data.locations.filter(function (l) { return l.factions.indexOf(f.name) >= 0; });
      var jobs = A.data.say.filter(function (s) { return s.key === "fac_job"; })[0];
      var job = jobs && jobs.triggers.filter(function (t) { return t.key.indexOf(f.id.replace(/-/g, "_")) >= 0; })[0];
      A.h(crumbs([["Factions", "#/factions"], [f.name]]) + "<h1>" + esc(f.name) + '</h1><div class="article"><div class="prose">' +
        A.prose(f.info, f.name) + (job ? '<h2>Work and rank</h2><p>Sworn members ask for work at the seat' + (job.where.length ? " (" + esc(job.where.join(", ").replace(/^location: /, "")) + ")" : "") +
        ': <code>' + esc(job.examples[0]) + '</code>. Ranks and promotion: <a href="#/mechanics/oaths-and-ranks">Oaths and Ranks</a>.</p>' : "") +
        (members.length ? "<h2>Members</h2><div class='grid'>" + members.map(function (n) { return card("people", n, esc(n.type)); }).join("") + "</div>" : "") +
        "</div>" + A.infobox(f.name, null, [["Kind", esc(f.type)], ["Members", members.length || ""],
          ["Holds", seats.slice(0, 12).map(function (l) { return placeLink(l.name); }).join(" · ")]]) + "</div>");
      return;
    }
    A.listPage({title: "Factions", rows: A.data.factions, wide: true, lede: "The houses, villages, courts and bands you can swear to, work for or cross.",
      facet: {kind: function (r) { return r.type; }}, names: {kind: "Kind"},
      card: function (r) { return card("factions", r, esc(r.type)); }});
  };

  /* ---------- creatures ---------- */
  P.creatures = function (id) {
    if (id) {
      var c = find("creatures", id);
      if (!c) return missing("Creatures");
      var met = uniq(A.data.npcs.filter(function (n) { return n.type === c.name; }));
      var tags = function (l, cls) { return l.map(function (x) { return '<span class="tag ' + cls + '">' + esc(x) + "</span>"; }).join(""); };
      A.h(crumbs([["Creatures", "#/creatures"], [c.name]]) + "<h1>" + esc(c.name) + '</h1><div class="article"><div class="prose">' +
        A.prose(c.info, c.name) + (met.length ? "<h2>Known " + esc(c.name) + "</h2><div class='grid'>" + met.map(function (n) {
          return card("people", n, n.level ? "level " + n.level : "");
        }).join("") + "</div>" : "") + "</div>" +
        A.infobox(c.name, met[0] && met[0].img, [["Weak to", tags(c.weak, "weak")], ["Resists", tags(c.resist, "strong")], ["Immune", tags(c.immune, "boss")]]) + "</div>");
      return;
    }
    A.listPage({title: "Creatures", rows: A.data.creatures, wide: true, lede: "Yokai, beasts, spirits and the kinds of people the isles send against you.",
      card: function (r) { return card("creatures", r, (r.weak.length ? "weak to " + esc(r.weak.join(", ")) : "")); }});
  };

  /* ---------- lore ---------- */
  P.lore = function (id) {
    if (id) {
      var l = find("lore", id);
      if (!l) return missing("Lore");
      A.h(crumbs([["Lore", "#/lore"], [l.name]]) + "<h1>" + esc(l.name) + '</h1><div class="prose">' + A.prose(l.info, l.name) + "</div>");
      return;
    }
    A.listPage({title: "Lore", rows: A.data.lore, wide: true, lede: "History, powers, society, places and the folk tales the isles tell.",
      card: function (r) { return card("lore", r, ""); }});
  };

  /* ---------- mechanics: the guide books ---------- */
  var BOOK_SAY = {};
  function bookSay() {
    if (Object.keys(BOOK_SAY).length) return BOOK_SAY;
    A.data.say.forEach(function (f) { (BOOK_SAY[f.book] = BOOK_SAY[f.book] || []).push(f); });
    return BOOK_SAY;
  }
  P.mechanics = function (id) {
    if (id) {
      var b = find("books", id);
      if (!b) return missing("Mechanics");
      var acts = bookSay()[b.name] || [];
      var bench = b.name === "The Craftsman's Primer" || b.name === "The Isles Recipe Book";
      A.h(crumbs([["Mechanics", "#/mechanics"], [b.name]]) + "<h1>" + esc(b.name) + '</h1><div class="prose">' + A.prose(b.info, b.name) +
        (acts.length || bench ? "<h2>What to say</h2><ul>" + (bench ? '<li><a href="#/bench">The crafting bench</a>: build the exact line and see what the forge says</li>' : "") +
          acts.map(function (f) { return '<li><a href="#/say/' + f.key + '">' + esc(f.label) + "</a></li>"; }).join("") + "</ul>" : "") +
        '<p class="note">Every new character carries this book in the world.</p></div>');
      return;
    }
    A.h(crumbs([["Mechanics"]]) + '<h1>Mechanics</h1><p class="lede">How the isles work, as the guide books every new character carries explain it. ' +
      'Each book links to the lines that set its system off.</p><div class="grid wide">' +
      A.data.books.map(function (b) { return card("mechanics", b, (bookSay()[b.name] || []).length ? (bookSay()[b.name].length + " typed actions") : ""); }).join("") +
      '</div><h2>Tables</h2><ul><li><a href="#/skills">Skills</a>: what each art covers and how hard things are</li><li><a href="#/traits">Traits</a>: every creation pick and what it gives</li>' +
      '<li><a href="#/abilities">Abilities</a>: requirements, power and cooldown</li><li><a href="#/items">Items</a>: bonuses by item</li></ul>');
  };

  /* ---------- skills, traits, abilities, items ---------- */
  P.skills = function () {
    A.h(crumbs([["Skills"]]) + '<h1>Skills</h1><p class="lede">The isles\' arts. Each names what it covers, what it does not, and examples by difficulty.</p>' +
      A.data.skills.map(function (s) {
        return '<h2 class="cap" id="' + s.id + '" data-toc="' + esc(s.name) + '">' + esc(s.name) + ' <span class="tag">' + esc(s.type) + '</span> <span class="tag">' + esc(s.attribute) + '</span></h2><div class="prose">' +
          A.prose(s.info) + "</div>";
      }).join(""));
  };
  function kv(o) {
    return Object.keys(o || {}).map(function (k) { var v = o[k]; return esc(k) + " " + (typeof v === "number" && v > 0 ? "+" + v : esc(JSON.stringify(v))); }).join(", ");
  }
  function needs(list) {
    return (list || []).map(function (r) { return esc((r.type === "skill" ? "" : r.type + " ") + (r.variable || "") + " " + (r.amount != null ? r.amount : "")); }).join(", ");
  }
  P.traits = function (id) {
    if (id) {
      var t = find("traits", id);
      if (!t) return missing("Traits");
      var cat = A.data.categories.filter(function (c) { return c.name === t.category; })[0];
      A.h(crumbs([["Traits", "#/traits"], [t.name]]) + "<h1>" + esc(t.name) + '</h1><div class="article"><div class="prose">' + A.prose(t.info, t.name) +
        (cat ? "<h2>" + esc(cat.name) + "</h2>" + A.prose(cat.info.split("\n\n")[0]) : "") + "</div>" +
        A.infobox(t.name, null, [["Category", esc(t.category)], ["Attributes", kv(t.attributes)], ["Skills", kv(t.skills)], ["Resources", kv(t.resources)],
          ["Abilities", t.abilities.map(function (a) { var r = A.byName("abilities", a); return r ? '<a href="' + A.href("abilities", r.id) + '">' + esc(a) + "</a>" : esc(a); }).join(", ")],
          ["Starts with", t.startingItems.map(function (i) { return esc(i.item || i); }).join(", ")],
          ["Needs", t.unlockedBy.map(function (u) { var r = A.data.traits.filter(function (x) { return x.id === u || x.name === u; })[0]; return r ? '<a href="' + A.href("traits", r.id) + '">' + esc(r.name) + "</a>" : esc(u); }).join(" or ")],
          ["Not with", t.excludedBy.map(esc).join(", ")]]) + "</div>");
      return;
    }
    A.listPage({title: "Traits", rows: A.data.traits, wide: true, lede: "Every pick in character creation and the traits a story gives you.",
      facet: {category: function (r) { return r.category; }}, names: {category: "Category"},
      card: function (r) { return card("traits", r, esc(r.category) + (kv(r.attributes) ? " · " + kv(r.attributes) : "")); }});
  };
  P.abilities = function (id) {
    if (id) {
      var a = find("abilities", id);
      if (!a) return missing("Abilities");
      A.h(crumbs([["Abilities", "#/abilities"], [a.name]]) + "<h1>" + esc(a.name) + '</h1><div class="article"><div class="prose">' + A.prose(a.info, a.name) + "</div>" +
        A.infobox(a.name, null, [["Needs", needs(a.needs)], ["Power", a.bonus], ["Cooldown", a.cooldown != null ? a.cooldown + " turns" : ""]]) + "</div>");
      return;
    }
    A.listPage({title: "Abilities", rows: A.data.abilities, wide: true, lede: "Techniques, arts and powers, with what each needs.",
      facet: {needs: function (r) { return r.needs[0] ? r.needs[0].type === "skill" ? r.needs[0].variable : r.needs[0].type : "none"; }}, names: {needs: "Needs"},
      card: function (r) { return card("abilities", r, needs(r.needs)); }});
  };
  P.items = function (id) {
    if (id) {
      var it = find("items", id);
      if (!it) return missing("Items");
      A.h(crumbs([["Items", "#/items"], [it.name]]) + "<h1>" + esc(it.name) + '</h1><div class="article"><div class="prose">' + A.prose(it.info, it.name) + "</div>" +
        A.infobox(it.name, it.img, [["Category", esc(it.category)], ["Bonuses", it.bonuses.map(function (b) {
          return esc(b.variable) + " " + (b.value > 0 ? "+" : "") + esc(b.value);
        }).join(", ")]]) + "</div>");
      return;
    }
    A.listPage({title: "Items", rows: A.data.items, lede: "Weapons, armour, remedies, tools, talismans, trade goods and the guide books.",
      facet: {category: function (r) { return r.category; }}, names: {category: "Category"},
      card: function (r) { return card("items", r, esc(r.category)); }});
  };

  /* ---------- starts, modes, music, search ---------- */
  P.starts = function (id) {
    if (id) {
      var s = find("starts", id);
      if (!s) return missing("Story starts");
      A.h(crumbs([["Story starts", "#/starts"], [s.name]]) + "<h1>" + esc(s.name) + '</h1><div class="prose">' + A.prose(s.info, s.name) + "</div>");
      return;
    }
    A.listPage({title: "Story starts", rows: A.data.starts, wide: true, lede: "Where a story can open, and who is in the first scene.",
      card: function (r) { return card("starts", r, ""); }});
  };
  P.modes = function () {
    A.h(crumbs([["Game modes"]]) + '<h1>Game modes</h1><p class="lede">How the story leans: what to expect more of, what less, and which starts suit it.</p>' +
      A.data.modes.map(function (m) { return "<h2>" + esc(m.name) + '</h2><div class="prose">' + A.prose(m.info) + "</div>"; }).join(""));
  };
  P.music = function () {
    var by = {};
    A.data.music.forEach(function (t) { (by[t.mood] = by[t.mood] || []).push(t); });
    A.h(crumbs([["Music"]]) + '<h1>Music</h1><p class="lede">The soundtrack the isles play, by the mood of the scene.</p>' +
      Object.keys(by).sort().map(function (m) {
        return "<h2>" + esc(m.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")) + '</h2><div class="grid wide">' + by[m].map(function (t) {
          return '<div class="say"><div class="t">' + esc(t.title) + '</div><audio controls preload="none" aria-label="' + esc(t.title) + '" src="' + esc(t.url) + '"></audio></div>';
        }).join("") + "</div>";
      }).join(""));
  };
  /* results grouped by kind, best kinds first (people and places), each group's best matches first */
  P.search = function () {
    var q = decodeURIComponent((location.hash.split("q=")[1] || "").split("&")[0]);
    var list = A.search(q), groups = {}, order = [];
    list.forEach(function (e) { if (!groups[e.kind]) { groups[e.kind] = []; order.push(e.kind); } groups[e.kind].push(e); });
    var label = {people: "People", places: "Places", factions: "Factions", creatures: "Creatures", lore: "Lore", mechanics: "Guide books",
                 abilities: "Abilities", traits: "Traits", skills: "Skills", items: "Items", starts: "Story starts", map: "Maps"};
    A.h(crumbs([["Search"]]) + "<h1>Results for \"" + esc(q) + '"</h1><p class="count">' + list.length + " found in " + order.length + " kinds</p>" +
      (list.length ? "" : '<p class="lede">Nothing matches. Try one word of a name, or a place.</p>') +
      order.map(function (k) {
        var rows = groups[k];
        return '<h2 class="kindhead" data-toc="' + esc(label[k] || k) + '">' + esc(label[k] || k) + ' <span class="count">' + rows.length + "</span></h2><div class='grid" +
          (k === "people" || k === "places" ? "" : " wide") + "'>" + rows.slice(0, 60).map(function (e) {
            var r = A.byId[e.kind + "/" + e.id];
            return card(e.kind, r, esc(r.type || r.district || r.category || ""), e.kind === "places");
          }).join("") + "</div>" + (rows.length > 60 ? '<p class="note">' + (rows.length - 60) + " more: narrow the search.</p>" : "");
      }).join(""));
  };

  /* ---------- districts: the hub pages (the district's lore, its places, people and factions) ---------- */
  function districtsAll() {
    var out = {};
    A.data.locations.forEach(function (l) { if (l.district) (out[l.district] = out[l.district] || []).push(l); });
    return out;
  }
  P.districts = function (id) {
    var all = districtsAll(), names = Object.keys(all).sort();
    var sl = function (n) { return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
    var lore = function (n) { return A.byName("lore", "District: " + n); };
    var isles = regionOf("The Asagiri Isles");
    if (!id) {
      A.h(crumbs([["Districts"]]) + '<h1>Districts</h1><p class="lede">The isles are twelve districts on one map, from the gentle plain around ' +
        'Miyako to the ice of Hyoga Reach. Each one\'s level band covers everything in it.</p><div class="grid wide">' +
        names.map(function (n) {
          var places = all[n].filter(function (l) { return l.region === "The Asagiri Isles"; });
          var hub = places.filter(function (l) { return l.img; })[0] || {};
          var lv = places.map(function (l) { return l.levels || []; }).reduce(function (a, b) { return a.concat(b); }, []);
          var band = lv.length ? Math.min.apply(null, lv) + "-" + Math.max.apply(null, lv) : "";
          var lr = lore(n);
          return '<a class="card" href="#/districts/' + sl(n) + '"><div class="pic land">' + A.img(hub.img, n) + '</div><div class="body"><div class="t">' +
            esc(n) + '</div><div class="s">' + places.length + " places" + (band ? " · level " + band : "") + '</div><div class="x">' +
            esc(lr ? A.first(lr.info.replace(/^.*? is a district of the Asagiri Isles\. /, ""), 140) : "") + "</div></div></a>";
        }).join("") + "</div>");
      return;
    }
    var name = names.filter(function (n) { return sl(n) === id; })[0];
    if (!name) return missing("Districts");
    var before = all[name].filter(function (l) { return l.region === "The Asagiri Isles"; });
    var after = all[name].filter(function (l) { return l.region === "The Asagiri Isles, After the War"; });
    var here = {}; all[name].forEach(function (l) { here[l.name] = 1; });
    var people = uniq(A.data.npcs.filter(function (n) { return here[n.location]; }));
    var facs = {}; all[name].forEach(function (l) { l.factions.forEach(function (f) { facs[f] = 1; }); });
    var lr = lore(name);
    A.h(crumbs([["Districts", "#/districts"], [name]]) + "<h1>" + esc(name) + '</h1><div class="prose">' + (lr ? A.prose(lr.info, name) : "") +
      "</div><p>" + (isles ? '<a href="#/map/' + isles.id + "?district=" + encodeURIComponent(name) + '">Show it on the map</a> · ' : "") +
      '<a href="#/people?district=' + encodeURIComponent(name) + '">Everyone here</a></p>' +
      "<h2>Places before the war</h2><div class='grid'>" + before.map(function (l) { return card("places", l, esc(l.kind) + (levels(l.levels) ? " · lv " + levels(l.levels) : ""), true); }).join("") + "</div>" +
      (after.length ? "<h2>Places after the war</h2><div class='grid'>" + after.map(function (l) { return card("places", l, esc(l.kind) + (levels(l.levels) ? " · lv " + levels(l.levels) : ""), true); }).join("") + "</div>" : "") +
      (Object.keys(facs).length ? "<h2>Factions here</h2><div class='grid wide'>" + Object.keys(facs).sort().map(function (f) {
        var r = A.byName("factions", f); return r ? card("factions", r, esc(r.type)) : "";
      }).join("") + "</div>" : "") +
      (people.length ? "<h2>People</h2><div class='grid'>" + people.slice(0, 48).map(function (n) { return card("people", n, esc(n.type)); }).join("") + "</div>" +
        (people.length > 48 ? '<p><a href="#/people?district=' + encodeURIComponent(name) + '">All ' + people.length + " people of " + esc(name) + "</a></p>" : "") : ""));
  };

  /* ---------- what to say ---------- */
  P.say = function (key) {
    var fams = A.data.say;
    if (!key) {
      var by = {};
      fams.forEach(function (f) { (by[f.system] = by[f.system] || []).push(f); });
      A.h(crumbs([["What to say"]]) + '<h1>What to say</h1><p class="lede">The lines that set off the isles\' systems. Each one is read off the world\'s own ' +
        "triggers and checked against their word checks, so the words are right; where a line also needs the narrator to agree the moment is real, it says so. " +
        'Crafting has its own <a href="#/bench">bench</a>.</p>' +
        Object.keys(by).map(function (s) {
          return "<h2>" + esc(s) + "</h2><div class='grid wide'>" + by[s].map(function (f) {
            var t = f.triggers[0];
            return '<a class="card" href="#/say/' + f.key + '"><div class="body"><div class="t">' + esc(f.label) + '</div><div class="s">' + esc(f.how) +
              "</div>" + (t.examples[0] ? '<div class="x"><code>' + esc(t.examples[0]) + "</code></div>" : "") + "</div></a>";
          }).join("") + "</div>";
        }).join(""));
      return;
    }
    var f = fams.filter(function (x) { return x.key === key; })[0];
    if (!f) return missing("What to say");
    var book = f.book && A.byName("books", f.book);
    A.h(crumbs([["What to say", "#/say"], [f.label]]) + "<h1>" + esc(f.label) + '</h1><p class="lede">' + esc(f.how) +
      (book ? ' Rules: <a href="' + A.href("mechanics", book.id) + '">' + esc(book.name) + "</a>." : "") + "</p>" +
      '<div class="say"><label for="try"><b>Try your own line</b></label><div class="line"><input id="try" style="flex:1" placeholder="Type what your character does..."></div>' +
      '<div id="tryout" class="note" aria-live="polite">Type a line to see which of these it would set off.</div></div>' +
      (f.triggers.length > 6 ? '<div class="filters"><input type="search" id="tf" placeholder="Filter by place or person" aria-label="Filter by place or person"><span class="count" id="tc" aria-live="polite"></span></div>' : "") +
      '<div id="trows"></div>');
    function row(t, i) {
      return '<div class="say" data-i="' + i + '">' + (t.where.length ? "<div><b>Where:</b> " + t.where.map(function (w) {
        var nm = w.split(": ").slice(1).join(": "); return esc(w.split(":")[0]) + " " + placeLink(nm);
      }).join(", ") + "</div>" : "") + (t.dests.length ? "<div><b>Destinations:</b> " + t.dests.map(function (d) { return placeLink(d); }).join(", ") + "</div>" : "") +
      (t.needs.length ? "<div><b>Also needs:</b> " + t.needs.map(function (n) { return A.link(esc(n)); }).join("; ") + "</div>" : "") +
      t.examples.map(function (e) {
        return '<div class="line"><code>' + esc(e) + '</code><button data-copy="' + esc(e) + '" aria-label="Copy: ' + esc(e) + '">Copy</button></div>';
      }).join("") + '<div class="note">Word check: ' + t.words.map(function (w) { return "<code>" + esc(w) + "</code>"; }).join(" and ") + "</div></div>";
    }
    function draw(filter) {
      var q = (filter || "").toLowerCase(), n = 0;
      document.getElementById("trows").innerHTML = f.triggers.map(function (t, i) {
        var hay = (t.where.join(" ") + " " + t.needs.join(" ") + " " + t.dests.join(" ") + " " + t.examples.join(" ")).toLowerCase();
        if (q && hay.indexOf(q) < 0) return "";
        n++; return row(t, i);
      }).join("");
      var tc = document.getElementById("tc"); if (tc) tc.textContent = n + " of " + f.triggers.length;
    }
    draw("");
    var tf = document.getElementById("tf"); if (tf) tf.addEventListener("input", function () { draw(tf.value); });
    document.getElementById("trows").addEventListener("click", function (e) {
      var b = e.target.closest("[data-copy]"); if (b) copy(b, b.dataset.copy);
    });
    document.getElementById("try").addEventListener("input", function () {
      var line = this.value, out = document.getElementById("tryout");
      if (!line.trim()) { out.innerHTML = "Type a line to see which of these it would set off."; return; }
      var pass = f.triggers.filter(function (t) { return !Bench.wordCheck(t, line).length; });
      out.innerHTML = pass.length ? '<span class="ok">Passes the word check for ' + pass.length + " of " + f.triggers.length + "</span>" +
        (pass.length < f.triggers.length ? ". The rest need other words: see each one's word check below." : ".") :
        '<span class="no">No match.</span> Use one of the words in a word check below.';
    });
  };

  /* ---------- the crafting bench ---------- */
  var BENCH_KEY = "asagiri-bench-ledger";
  P.bench = function () {
    var C = A.data.craft;
    var ledger = A.tryStore(BENCH_KEY) || {};
    function save(storage) {
      ledger = Bench.own(C, storage);
      return A.tryStore(BENCH_KEY, ledger);
    }
    var NOSAVE = '<p class="warn">This browser will not keep the ledger (storage is blocked): it lasts until you leave the page.</p>';
    var stations = A.data.locations;
    var QUAL = ["Base", "Fine", "Superior", "Master-made", "Named"];
    A.h(crumbs([["Crafting bench"]]) + '<h1>Crafting bench</h1><p class="lede">Build the exact line to type, then run it through the isles\' own crafting ' +
      'triggers, the same code the game runs, to see what the narrator will be told. Rules: <a href="#/mechanics/the-craftsman-s-primer">The Craftsman\'s Primer</a>, ' +
      'recipes: <a href="#/mechanics/the-isles-recipe-book">The Isles Recipe Book</a>.</p><div class="cols"><div>' +
      '<div class="form"><label for="bact">I want to</label><select id="bact"><option value="craft">Craft a recipe</option><option value="design">Design a new recipe</option>' +
      '<option value="upgrade">Upgrade something I made</option></select>' +
      '<label for="brec" data-for="craft upgrade">Recipe</label><select id="brec" data-for="craft upgrade"></select>' +
      '<label for="bqual" data-for="upgrade">It is now</label><select id="bqual" data-for="upgrade"><option value="">Base</option><option>Fine</option><option>Superior</option><option>Master-made</option></select>' +
      '<label for="bname" data-for="design">Item name</label><input id="bname" data-for="design" placeholder="frost spear">' +
      '<label for="bmats" data-for="design">Materials</label><input id="bmats" data-for="design" placeholder="iron spearhead, ice crystal, cedar haft (up to 5)">' +
      '<label for="bstat" data-for="design">Station</label><select id="bstat" data-for="design"><option value="">let the item choose</option></select>' +
      '<label for="bloc">Where you are</label><select id="bloc"></select><label for="barea">Area</label><select id="barea"></select>' +
      '<label for="bskill">Craft skill</label><input id="bskill" type="number" min="0" max="30" value="3">' +
      '<span></span><p class="note" id="bmaster"></p>' +
      '<label for="broll">The roll</label><select id="broll">' + C.tiers.map(function (t) { return "<option" + (t === "Success" ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select>" +
      '</div><div class="say" style="margin-top:16px"><div><b>Click the ability</b> <span class="tag" id="babil"></span> <b>and type:</b></div>' +
      '<div class="line"><input id="bline" style="flex:1" aria-label="What to type"><button data-copyline aria-label="Copy the words to type">Copy</button></div>' +
      '<div class="note">The action box then reads: <code id="bfull"></code></div><div class="line"><button class="primary" id="brun">Run it at the bench</button>' +
      '<button id="breset">Clear my ledger</button></div></div></div><div><div id="bout" class="verdict note" aria-live="polite">Pick what to make and press Run.</div>' +
      '<div id="bledger"></div></div></div>');
    var $ = function (id) { return document.getElementById(id); };
    var words = {};
    C.triggers.forEach(function (t) { if (t.ability) words[t.key] = t.ability; });
    var known = function () { return Object.assign({}, C.seed.asg_art_recipes, ledger.asg_art_recipes || {}); };
    function stationWords() {
      var all = {};
      Object.keys(C.seed.asg_art_recipes).forEach(function (k) { all[C.seed.asg_art_recipes[k].station] = 1; });
      return Object.keys(all).sort();
    }
    $("bstat").innerHTML += stationWords().map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("");
    $("bloc").innerHTML = stations.map(function (l) { return "<option>" + esc(l.name) + "</option>"; }).join("");
    function fillAreas() {
      var l = A.byName("locations", $("bloc").value);
      $("barea").innerHTML = (l ? l.areas : []).map(function (a) { return "<option>" + esc(a.name) + "</option>"; }).join("");
    }
    function fillRecipes() {
      var r = known(), act = $("bact").value;
      var names = act === "upgrade" ? Object.keys((ledger.asg_art_stock || {})).concat(Object.keys(r)) : Object.keys(r);
      names = names.filter(function (n, i) { return names.indexOf(n) === i; }).sort();
      $("brec").innerHTML = names.map(function (n) { return "<option>" + esc(n) + "</option>"; }).join("");
    }
    function pickStation() {
      var rec = known()[$("brec").value];
      if (!rec || $("bact").value === "design") return;
      var at = Bench.stationPlace(C, stations, rec.disc);
      if (at) { $("bloc").value = at[0]; fillAreas(); $("barea").value = at[1]; }
    }
    function line() {
      var act = $("bact").value;
      if (act === "craft") return $("brec").value;
      if (act === "upgrade") return ($("bqual").value ? $("bqual").value + " " : "") + $("brec").value;
      var mats = $("bmats").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      var m = mats.length > 1 ? mats.slice(0, -1).join(", ") + " and " + mats[mats.length - 1] : mats[0];
      return ($("bname").value.trim() || "frost spear") + (m ? " from " + m : "") + ($("bstat").value ? " at a " + $("bstat").value : "");
    }
    function trig() { return {craft: "asg_art_craft", design: "asg_art_design", upgrade: "asg_art_upgrade"}[$("bact").value]; }
    function update() {
      var act = $("bact").value, rec = known()[$("brec").value];
      $("bmaster").textContent = rec && act !== "design" ? "Stations for " + rec.disc + ": " + (C.stations[rec.disc] || []).join(", ") +
        ". Master-made and Named only at " + (C.masters[rec.disc] || []).join(", ") + "." : "";
      document.querySelectorAll("[data-for]").forEach(function (el) { el.hidden = el.dataset.for.split(" ").indexOf(act) < 0; });
      $("babil").textContent = words[trig()];
      $("bline").value = line();
      $("bfull").textContent = "Use " + words[trig()] + " to " + $("bline").value;
    }
    function drawLedger() {
      var mine = ledger.asg_art_recipes || {}, stock = ledger.asg_art_stock || {};
      var own = Object.keys(mine).filter(function (k) { return !C.seed.asg_art_recipes[k]; });
      $("bledger").innerHTML = "<h3>My ledger (this browser only)</h3><p class='note'>" + Object.keys(C.seed.asg_art_recipes).length + " book recipes" +
        (own.length ? ", designed: " + own.map(esc).join(", ") : "") + "</p>" + (Object.keys(stock).length ? "<ul>" + Object.keys(stock).map(function (k) {
          return "<li>" + esc(k) + ": " + (stock[k] || []).map(function (n, q) { return n ? QUAL[q] + " x" + n : ""; }).filter(Boolean).join(", ") + "</li>";
        }).join("") + "</ul>" : "<p class='note'>Nothing made yet.</p>");
    }
    function scene(text, story) {
      var skills = {}; C.crafts.forEach(function (c) { skills[c] = Number($("bskill").value) || 0; });
      return {text: text, story: story || "", tick: (ledger.__tick || 10) + 1, storage: ledger, location: $("bloc").value, area: $("barea").value,
              roll: $("broll").value, skills: skills};
    }
    function run() {
      var full = "Use " + words[trig()] + " to " + $("bline").value;
      $("bfull").textContent = full;
      var res, sc = scene(full);
      try { res = Bench.craftTurn(C, sc); }
      catch (e) { $("bout").innerHTML = '<span class="no">The bench could not run this: ' + esc(e.message) + "</span>"; return; }
      var bt = Bench.beats(res), pend = res.storage.asg_art_pending || [];
      res.storage.__tick = sc.tick;
      var kept = save(res.storage);
      var named = pend.filter(function (p) { return p.tick === sc.tick; }).pop() || null;
      $("bout").innerHTML = (named ? '<div class="ok"><b>Accepted.</b> The narrator is told to finish it and name it in brackets: <code>[' + esc(named.options[0].name) +
        "]</code></div>" : '<div class="warn"><b>Not made this turn.</b> Read why below.</div>') +
        "<h3>What the narrator is told</h3>" + (bt.length ? bt.map(function (b) { return '<div class="beat">' + esc(b) + "</div>"; }).join("") : "<p class='note'>Nothing: the line did not reach a crafting trigger.</p>") +
        (named ? '<button id="bcommit">The narrator wrote [' + esc(named.options[0].name) + "]</button>" : "") + (kept ? "" : NOSAVE) +
        '<div id="bcommitout"></div>';
      if (named) $("bcommit").onclick = function () {
        var q = named.options[0].q || 0, before = Bench.stockOf(Bench.own(C, ledger), named.base, q), c;
        var sc2 = scene("", Bench.commitLine(named.options[0].name));
        try { c = Bench.commitTurn(C, sc2); }
        catch (e) { $("bcommitout").innerHTML = '<p class="no">The commit could not run: ' + esc(e.message) + "</p>"; return; }
        c.storage.__tick = sc2.tick;
        var ok = save(c.storage), after = Bench.stockOf(ledger, named.base, q);
        $("bcommit").disabled = true;
        $("bcommitout").innerHTML = after > before ? '<p class="ok">Recorded in your ledger: ' + esc(named.options[0].name) + " x" + after + ".</p>" + (ok ? "" : NOSAVE) :
          '<p class="no">The commit did not record it (nothing was waiting for that name).</p>';
        drawLedger(); fillRecipes();
      };
      drawLedger();
    }
    ["bact", "brec", "bqual", "bname", "bmats", "bstat", "bloc", "barea"].forEach(function (id) {
      $(id).addEventListener(id === "bname" || id === "bmats" ? "input" : "change", function () {
        if (id === "bact") fillRecipes();
        if (id === "brec") pickStation();
        if (id === "bloc") fillAreas();
        update();
      });
    });
    $("bline").addEventListener("input", function () { $("bfull").textContent = "Use " + words[trig()] + " to " + this.value; });
    $("brun").onclick = run;
    $("breset").onclick = function () { save({}); drawLedger(); fillRecipes(); $("bout").innerHTML = "Ledger cleared."; };
    document.querySelector("[data-copyline]").onclick = function () { copy(this, $("bline").value); };
    fillAreas(); fillRecipes(); pickStation(); update(); drawLedger();
  };
})();
