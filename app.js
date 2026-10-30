/* OhmGo storefront */
(function () {
  var esc = OG.esc, money = OG.money, PAGE = 24;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var app = $('#app');
  /* In-page router (the published viewer only passes plain #names, so paths stay in memory). */
  var H = { _h: '#/', get hash() { return this._h; }, set hash(v) { this._h = v; route(); } };

  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }
  function stars(n) { var r = Math.round(n), s = ''; for (var i = 1; i <= 5; i++) s += i <= r ? '★' : '☆'; return s; }
  function dt(t) { return new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function chipCls(s) { return s === 'Out for Delivery' ? 'Out' : s; }

  /* ---------- Chrome ---------- */
  function chrome() {
    var s = OG.settings(), u = OG.session();
    var cats = OG.cats.map(function (c) { return '<a href="#/shop?cat=' + c.id + '">' + esc(c.name) + '</a>'; }).join('');
    $('#top').innerHTML =
      '<div class="announce">' + esc(s.announce) + '</div>' +
      (OG.isAdmin() ? '<div class="adminbar">ADMIN MODE <a href="#" data-act="admin-open">Open Admin Panel</a> <a href="#" data-act="admin-out">Log out admin</a></div>' : '') +
      '<header class="top"><div class="wrap"><div class="hdr">' +
      '<a class="brand" href="#/"><b>OhmGo</b><span>ELECTRONICS FOR YOU</span></a>' +
      '<div class="search"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" placeholder="Search Arduino, ESP32, sensors, resistors..." autocomplete="off"></div>' +
      '<nav class="nav"><a href="#/projects"><span class="t">Projects</span><span class="m">🛠</span></a><a href="#/orders"><span class="t">Orders</span><span class="m">📦</span></a>' +
      '<a href="#/cart" id="cartlink"><span class="t">Cart</span><span class="m">🛒</span><span class="badge" id="cb"></span></a>' +
      '<a href="#/account">' + (u ? esc(u.name.split(' ')[0]) : 'Login') + '</a></nav></div>' +
      '<div class="cats">' + cats + '</div></div></header>';
    var q = $('#q'), tm;
    q.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { H.hash = '#/shop?q=' + encodeURIComponent(q.value.trim()); }, 300); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { clearTimeout(tm); H.hash = '#/shop?q=' + encodeURIComponent(q.value.trim()); } });
    cartBadge();
    $('#foot').innerHTML =
      '<footer><div class="wrap"><div class="cols"><div><h3 style="color:#fff;font-size:28px">OhmGo</h3><p style="max-width:420px">' + esc(s.about) + '</p></div>' +
      '<div><h4>Shop</h4><a href="#/shop">All components</a><a href="#/shop?cat=kits">Project kits</a><a href="#/shop?cat=school">School kits</a><a href="#/projects">Custom projects</a></div>' +
      '<div><h4>Contact</h4><a href="tel:+91' + esc(s.phone) + '">📞 ' + esc(s.phone) + '</a><a href="https://instagram.com/' + esc(s.insta) + '" target="_blank" rel="noopener">📷 @' + esc(s.insta) + '</a><a href="mailto:' + esc(s.email) + '">✉ ' + esc(s.email) + '</a></div></div>' +
      '<p class="small" style="margin-top:22px;opacity:.7">© ' + new Date().getFullYear() + ' OhmGo. Hyderabad, India. <a href="#" data-act="admin-open" style="display:inline;opacity:.6;margin-left:8px">Owner login</a></p></div></footer>' +
      '<a class="wa" target="_blank" rel="noopener" href="https://wa.me/91' + esc(s.phone) + '?text=' + encodeURIComponent('Hi OhmGo, I need help with ') + '">Chat on WhatsApp</a>';
  }
  function cartBadge() { var n = OG.cartCount(), b = $('#cb'); if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; } }

  /* ---------- Login gate ---------- */
  function gate() {
    $('#modal').innerHTML =
      '<div class="ov"><div class="mod"><img class="logo" src="logo.svg" alt="OhmGo">' +
      '<h2 style="text-align:center;font-size:24px">Welcome to OhmGo</h2><p class="muted small" style="text-align:center;margin:6px 0 16px">Sign in with your email and phone number to continue. New here? Sign up once, and next time just log in.</p>' +
      '<div class="tabs"><button data-tab="up" class="on">Sign up</button><button data-tab="in">Log in</button></div>' +
      '<form id="gf"><div class="fg" id="gn"><label>Full name</label><input name="name" autocomplete="name" placeholder="Your name"></div>' +
      '<div class="fg"><label>Email</label><input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></div>' +
      '<div class="fg"><label>Mobile number</label><input name="phone" type="tel" inputmode="numeric" maxlength="14" autocomplete="tel" placeholder="10-digit mobile number" required></div>' +
      '<div class="err" id="ge"></div><button class="btn acc block" id="gb">Create account</button></form><p class="small" style="text-align:center;margin-top:12px"><a href="#" data-act="admin-open" style="color:var(--acc);font-weight:600">Store owner? Log in here</a></p></div></div>';
    var mode = 'up';
    $('#modal').querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () {
        mode = b.dataset.tab;
        $('#modal').querySelectorAll('[data-tab]').forEach(function (x) { x.classList.toggle('on', x === b); });
        $('#gn').style.display = mode === 'up' ? '' : 'none';
        $('#gb').textContent = mode === 'up' ? 'Create account' : 'Log in';
        $('#ge').textContent = '';
      };
    });
    $('#gf').onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, r = mode === 'up' ? OG.signUp(f.name.value, f.email.value, f.phone.value) : OG.logIn(f.email.value, f.phone.value);
      if (r.error) { $('#ge').textContent = r.error; return; }
      $('#modal').innerHTML = '';
      visited(r.user, r.isNew ? 'New sign-up' : 'Login');
      chrome(); route();
    };
  }
  function visited(u, kind) {
    OG.logVisit(u, kind);
    var s = OG.settings();
    if (s.notifyVisits) OG.notify('OhmGo: ' + kind + ' - ' + u.name, kind + '\nName: ' + u.name + '\nEmail: ' + u.email + '\nPhone: ' + u.phone + '\nTime: ' + dt(Date.now()));
    try { sessionStorage.setItem('og_vis', '1'); } catch (e) {}
  }

  /* ---------- Cards ---------- */
  function card(p) {
    var r = OG.rating(p.id), pc = OG.pct(p);
    return '<div class="pc">' + (pc >= 5 ? '<span class="off">' + pc + '% OFF</span>' : '') +
      '<a class="im" href="#/p/' + p.id + '"><img loading="lazy" alt="' + esc(p.name) + '" src="' + OG.img(p) + '"></a>' +
      '<div class="bd"><a class="nm" href="#/p/' + p.id + '">' + esc(p.name) + '</a>' +
      (r.n ? '<div class="stars">' + stars(r.avg) + ' <span class="muted small">(' + r.n + ')</span></div>' : '') +
      '<div class="price"><b>' + money(p.price) + '</b>' + (p.mrp > p.price ? '<s>' + money(p.mrp) + '</s>' : '') + '</div>' +
      (p.stock > 0 ? '<button class="btn sm acc" data-act="add" data-id="' + p.id + '">Add to cart</button>' : '<span class="oos">Out of stock</span>') + '</div></div>';
  }

  /* ---------- Pages ---------- */
  function home() {
    var s = OG.settings(), all = OG.products();
    var deals = all.filter(function (p) { return !p.project && p.stock > 0; }).sort(function (a, b) { return OG.pct(b) - OG.pct(a) || b.price - a.price; }).slice(0, 8);
    var boards = all.filter(function (p) { return p.cat === 'boards' && /Arduino Uno|ESP32 DevKit|NodeMCU|Nano V3|Raspberry Pi Pico$|Mega 2560 R3/.test(p.name); }).slice(0, 8);
    var kits = all.filter(function (p) { return p.cat === 'kits' || p.cat === 'school'; }).slice(0, 8);
    var projs = all.filter(function (p) { return p.cat === 'projects'; }).slice(0, 4);
    var revs = OG.reviews().slice(-3).reverse();
    var heroImg = boards[0] ? OG.img(boards[0]) : 'logo.svg';
    return '<section class="hero"><div><h1>' + esc(s.heroTitle) + '</h1><p>' + esc(s.heroSub) + '</p><div class="ctas"><a class="btn acc" href="#/shop">Shop components</a><a class="btn ghost" href="#/projects">Custom projects</a></div></div><div class="art"><img src="' + heroImg + '" alt=""></div></section>' +
      '<div class="trust"><div><b>Student prices</b>Lower than local Hyderabad markets</div><div><b>' + all.length.toLocaleString('en-IN') + '+ products</b>Boards, sensors, ICs, tools and more</div><div><b>Custom projects</b>B.Tech, Diploma and AI projects</div><div><b>Free delivery ' + money(s.freeAbove) + '+</b>Cancel any time before dispatch</div></div>' +
      offersStrip() +
      '<section class="sec"><h2>Shop by category</h2><div class="catgrid">' + OG.cats.map(function (c) {
        return '<a class="catcard" style="background:' + c.color + '" href="#/shop?cat=' + c.id + '"><span>' + esc(c.name) + '</span><small>' + all.filter(function (p) { return p.cat === c.id; }).length + ' items</small></a>';
      }).join('') + '</div></section>' +
      (boards.length ? '<section class="sec"><h2>Popular boards <a href="#/shop?cat=boards">View all</a></h2><div class="grid">' + boards.map(card).join('') + '</div></section>' : '') +
      '<section class="sec"><h2>Best deals <a href="#/shop?sort=disc">View all</a></h2><div class="grid">' + deals.map(card).join('') + '</div></section>' +
      '<section class="sec"><h2>Kits for students <a href="#/shop?cat=kits">View all</a></h2><div class="grid">' + kits.map(card).join('') + '</div></section>' +
      '<section class="sec card" style="padding:26px;background:linear-gradient(135deg,#fff6e0,#ffe9c2)"><h2 style="margin-bottom:8px">Need a custom project?</h2><p class="muted" style="max-width:640px">Tell us your idea, branch and deadline. We design, build and test it, and help with the report, PPT and viva.</p><a class="btn acc" href="#/projects" style="margin-top:12px">Request a project</a></section>' +
      (projs.length ? '<section class="sec"><h2>Ready projects <a href="#/projects">View all</a></h2><div class="grid">' + projs.map(card).join('') + '</div></section>' : '') +
      (revs.length ? '<section class="sec"><h2>What students say</h2><div class="grid">' + revs.map(function (r) { return '<div class="card" style="padding:14px"><div class="stars">' + stars(r.rating) + '</div><p style="margin:6px 0">' + esc(r.text) + '</p><b class="small">' + esc(r.name) + '</b></div>'; }).join('') + '</div></section>' : '');
  }

  function offersStrip() {
    var list = OG.coupons().filter(function (c) { return c.active && c.show && !(c.expires && Date.now() > new Date(c.expires + 'T23:59:59').getTime()) && !(c.limit > 0 && c.used >= c.limit); });
    if (!list.length) return '';
    return '<section class="sec" style="margin-top:0"><div class="card" style="padding:14px 16px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;background:#fff6e0"><b>Offers for you</b>' +
      list.map(function (c) { return '<span class="offer" style="cursor:default"><b>' + esc(c.code) + '</b><span>' + esc(OG.couponText(c)) + '</span></span>'; }).join('') + '<span class="small muted">Apply at cart</span></div></section>';
  }
  function parseQ() {
    var h = H.hash.slice(1), i = h.indexOf('?'), o = {};
    if (i >= 0) h.slice(i + 1).split('&').forEach(function (kv) { var a = kv.split('='); if (a[0]) o[a[0]] = decodeURIComponent((a[1] || '').replace(/\+/g, ' ')); });
    return o;
  }
  function qs(o) { return Object.keys(o).filter(function (k) { return o[k] !== '' && o[k] != null; }).map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&'); }

  function shop() {
    var q = parseQ(), list = OG.products();
    if (q.cat) list = list.filter(function (p) { return p.cat === q.cat; });
    if (q.level) list = list.filter(function (p) { return p.level.indexOf(q.level) >= 0; });
    if (q.q) { var toks = q.q.toLowerCase().split(/\s+/).filter(Boolean); list = list.filter(function (p) { var n = (p.name + ' ' + p.id).toLowerCase(); return toks.every(function (t) { return n.indexOf(t) >= 0; }); }); }
    if (q.stock) list = list.filter(function (p) { return p.stock > 0; });
    if (q.min) list = list.filter(function (p) { return p.price >= +q.min; });
    if (q.max) list = list.filter(function (p) { return p.price <= +q.max; });
    var sort = q.sort || 'rel';
    if (sort === 'low') list = list.slice().sort(function (a, b) { return a.price - b.price; });
    else if (sort === 'high') list = list.slice().sort(function (a, b) { return b.price - a.price; });
    else if (sort === 'disc') list = list.slice().sort(function (a, b) { return OG.pct(b) - OG.pct(a); });
    else if (sort === 'new') list = list.slice().reverse();
    var total = list.length, pages = Math.max(1, Math.ceil(total / PAGE)), pg = Math.min(pages, Math.max(1, +q.page || 1));
    var show = list.slice((pg - 1) * PAGE, pg * PAGE);
    function link(ch) { return '#/shop?' + qs(Object.assign({}, q, ch, { page: ch.page || '' })); }
    var counts = {}; OG.products().forEach(function (p) { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    var fl = '<a class="' + (!q.cat ? 'on' : '') + '" href="' + link({ cat: '' }) + '">All <span>' + OG.products().length + '</span></a>' +
      OG.cats.map(function (c) { return '<a class="' + (q.cat === c.id ? 'on' : '') + '" href="' + link({ cat: c.id }) + '">' + esc(c.name) + ' <span>' + (counts[c.id] || 0) + '</span></a>'; }).join('');
    var title = q.cat ? OG.cat(q.cat).name : (q.q ? 'Results for "' + q.q + '"' : 'All components');
    var pgs = '';
    if (pages > 1) {
      var from = Math.max(1, pg - 2), to = Math.min(pages, pg + 2);
      if (pg > 1) pgs += '<button data-go="' + link({ page: pg - 1 }) + '">Prev</button>';
      if (from > 1) pgs += '<button data-go="' + link({ page: 1 }) + '">1</button>' + (from > 2 ? '<span>...</span>' : '');
      for (var i = from; i <= to; i++) pgs += '<button class="' + (i === pg ? 'on' : '') + '" data-go="' + link({ page: i }) + '">' + i + '</button>';
      if (to < pages) pgs += (to < pages - 1 ? '<span>...</span>' : '') + '<button data-go="' + link({ page: pages }) + '">' + pages + '</button>';
      if (pg < pages) pgs += '<button data-go="' + link({ page: pg + 1 }) + '">Next</button>';
    }
    return '<div class="shop"><aside class="filters card" id="flt"><h4>Categories</h4><div class="fl">' + fl + '</div><h4>Level</h4><div class="fl">' +
      ['', 'School', 'B.Tech', 'Diploma'].map(function (l) { return '<a class="' + ((q.level || '') === l ? 'on' : '') + '" href="' + link({ level: l }) + '">' + (l || 'All levels') + '</a>'; }).join('') +
      '</div><h4>Price</h4><div class="row c2"><input id="pmin" type="number" min="0" placeholder="Min" value="' + esc(q.min || '') + '"><input id="pmax" type="number" min="0" placeholder="Max" value="' + esc(q.max || '') + '"></div>' +
      '<label style="margin-top:12px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="pst" style="width:auto" ' + (q.stock ? 'checked' : '') + '> In stock only</label><button class="btn sm block" style="margin-top:10px" data-act="applyprice">Apply</button></aside>' +
      '<section><div class="bar"><div><h2 style="font-size:24px">' + esc(title) + '</h2><span class="muted small">' + total.toLocaleString('en-IN') + ' products</span></div>' +
      '<div style="display:flex;gap:8px"><button class="btn sm ghost fbtn" data-act="toggleflt">Filters</button><select id="sort">' +
      [['rel', 'Relevance'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['disc', 'Biggest discount'], ['new', 'Newest']].map(function (o) { return '<option value="' + o[0] + '"' + (sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div></div>' +
      (show.length ? '<div class="grid">' + show.map(card).join('') + '</div><div class="pager">' + pgs + '</div>' : '<div class="empty"><h3>No products found</h3><p>Try a different search, or <a href="#/projects" style="color:var(--acc);font-weight:600">ask us for it</a>.</p></div>') + '</section></div>';
  }

  function product(id) {
    var p = OG.product(id); if (!p || p.hidden) return '<div class="empty"><h3>Product not found</h3><a class="btn" href="#/shop">Back to shop</a></div>';
    var c = OG.cat(p.cat), r = OG.rating(p.id), revs = OG.reviews(p.id).slice().reverse(), u = OG.session();
    var rel = OG.products().filter(function (x) { return x.cat === p.cat && x.id !== p.id; }).slice(0, 4);
    var mine = revs.filter(function (x) { return x.email === u.email; })[0];
    return '<div class="crumbs"><a href="#/">Home</a> / <a href="#/shop?cat=' + c.id + '">' + esc(c.name) + '</a></div>' +
      '<div class="pp"><div class="big"><img alt="' + esc(p.name) + '" src="' + OG.img(p) + '"></div><div>' +
      '<h1>' + esc(p.name) + '</h1>' + (r.n ? '<div class="stars" style="margin-bottom:6px">' + stars(r.avg) + ' <span class="muted small">' + r.avg.toFixed(1) + ' (' + r.n + ' reviews)</span></div>' : '<div class="muted small" style="margin-bottom:6px">No reviews yet</div>') +
      '<div class="price"><b>' + money(p.price) + '</b>' + (p.mrp > p.price ? '<s>' + money(p.mrp) + '</s><em>' + OG.pct(p) + '% off</em>' : '') + '</div>' +
      (p.mrp > p.price ? '<div class="muted small">Typical local market price ' + money(p.mrp) + '. Inclusive of all taxes.</div>' : '<div class="muted small">Inclusive of all taxes.</div>') +
      '<p style="margin:14px 0">' + esc(p.desc || '') + '</p>' +
      '<div class="small" style="margin-bottom:14px">' + (p.stock > 0 ? (p.stock < 10 ? '<b style="color:var(--warn)">Only ' + p.stock + ' left</b>' : '<b style="color:var(--ok)">In stock</b>') : '<b style="color:var(--bad)">Out of stock</b>') + ' &middot; SKU ' + p.id + (p.level && p.level !== 'All' ? ' &middot; Level: ' + esc(p.level) : '') + '</div>' +
      (p.stock > 0 ? '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="qty"><button data-act="q-" >-</button><span id="pq">1</span><button data-act="q+" data-max="' + p.stock + '">+</button></div><button class="btn acc" data-act="addq" data-id="' + p.id + '">Add to cart</button><button class="btn" data-act="buy" data-id="' + p.id + '">Buy now</button></div>' : '') +
      '<div class="card small" style="padding:12px;margin-top:16px">Delivery in Hyderabad and across India. <b>Free delivery on orders of ' + money(OG.settings().freeAbove) + ' and above</b> (' + money(OG.settings().shipFee) + ' below that). Cancel any time before the order is dispatched. Questions? Call ' + esc(OG.settings().phone) + '.</div></div></div>' +
      '<section class="sec"><h2>Customer reviews</h2><div class="two" style="grid-template-columns:1fr 340px"><div class="card">' +
      (revs.length ? revs.map(function (v) { return '<div class="rev"><div class="stars">' + stars(v.rating) + '</div><p style="margin:4px 0">' + esc(v.text) + '</p><span class="small muted">' + esc(v.name) + ' &middot; ' + dt(v.ts) + (v.verified ? ' &middot; <b style="color:var(--ok)">Verified purchase</b>' : '') + '</span></div>'; }).join('') : '<div class="empty">Be the first to review this product.</div>') +
      '</div><form class="card" style="padding:16px" id="rf" data-id="' + p.id + '"><h3 style="font-size:18px;margin-bottom:10px">' + (mine ? 'Update your review' : 'Write a review') + '</h3>' +
      '<div class="fg"><label>Rating</label><select name="rating">' + [5, 4, 3, 2, 1].map(function (n) { return '<option value="' + n + '"' + (mine && mine.rating === n ? ' selected' : '') + '>' + stars(n) + ' (' + n + ')</option>'; }).join('') + '</select></div>' +
      '<div class="fg"><label>Your review</label><textarea name="text" rows="4" maxlength="600" placeholder="How was the product?">' + esc(mine ? mine.text : '') + '</textarea></div><div class="err" id="re"></div><button class="btn acc block">Submit review</button></form></div></section>' +
      (rel.length ? '<section class="sec"><h2>More in ' + esc(c.name) + '</h2><div class="grid">' + rel.map(card).join('') + '</div></section>' : '');
  }

  function cart() {
    var cc = cartCalc(), items = cc.items, t = cc.t, s = OG.settings();
    if (!items.length) return '<div class="empty"><h2>Your cart is empty</h2><p>Add some components to get started.</p><a class="btn acc" href="#/shop">Browse products</a></div>';
    var fake = { id: '', cat: '', name: '' };
    return '<h1 style="margin:20px 0 0;font-size:28px">Shopping cart</h1><div class="two"><div class="card">' + items.map(function (i) {
      var p = OG.product(i.id);
      return '<div class="ci"><img src="' + OG.img(p || fake) + '" alt=""><div><a href="#/p/' + i.id + '" style="font-weight:600">' + esc(i.name) + '</a><div class="price"><b>' + money(i.price) + '</b>' + (i.mrp > i.price ? '<s>' + money(i.mrp) + '</s>' : '') + '</div>' +
        (i.qty >= i.stock ? '<div class="small" style="color:var(--warn)">Max available quantity added</div>' : '') + '</div>' +
        '<div style="text-align:right"><div class="qty"><button data-act="cq" data-id="' + i.id + '" data-d="-1">-</button><span>' + i.qty + '</span><button data-act="cq" data-id="' + i.id + '" data-d="1">+</button></div><div><button class="btn sm ghost" style="margin-top:8px;border:0;color:var(--bad)" data-act="crm" data-id="' + i.id + '">Remove</button></div></div></div>';
    }).join('') + '</div>' + summary(items, t, s, cc) + '</div>';
  }
  var applyMsg = '';
  function cartCalc() {
    var u = OG.session(), items = OG.cartItems(), code = OG.ls.get('coupon', null), cr = null, msg = '';
    if (code && items.length) { var r = OG.couponApply(code, items, u ? u.email : ''); if (r.error) { msg = r.error; OG.ls.del('coupon'); } else cr = r; }
    return { items: items, cr: cr, msg: msg, t: OG.cartTotals(items, cr) };
  }
  function reroute() { var n = $('#note'), v = n ? n.value : ''; route(); if ($('#note')) $('#note').value = v; }
  function summary(items, t, s, cc) {
    var save = items.reduce(function (a, i) { return a + (i.mrp - i.price) * i.qty; }, 0), net = t.sub - t.discount;
    var err = applyMsg || (cc && cc.msg) || ''; applyMsg = '';
    var offers = OG.coupons().filter(function (c) { return c.active && c.show && !(c.expires && Date.now() > new Date(c.expires + 'T23:59:59').getTime()) && !(c.limit > 0 && c.used >= c.limit); });
    var box = cc && cc.cr
      ? '<div class="cpn ok"><div><b>' + esc(cc.cr.code) + '</b> applied<div class="small muted">' + esc(cc.cr.note) + '</div></div><button class="btn sm ghost" data-act="rmcoupon">Remove</button></div>'
      : '<div class="cpn"><div style="display:flex;gap:6px"><input id="cpn" placeholder="Coupon code" autocomplete="off" style="text-transform:uppercase"><button class="btn sm" data-act="applycoupon">Apply</button></div>' +
        (offers.length ? '<div class="offers">' + offers.map(function (c) { return '<button class="offer" data-act="applycoupon" data-code="' + esc(c.code) + '"><b>' + esc(c.code) + '</b><span>' + esc(OG.couponText(c)) + '</span></button>'; }).join('') + '</div>' : '') + '</div>';
    return '<div class="card sum"><h3 style="font-size:18px;margin-bottom:8px">Price details</h3>' + box + (err ? '<div class="err">' + esc(err) + '</div>' : '') +
      '<div class="ln"><span>Price (' + items.reduce(function (a, i) { return a + i.qty; }, 0) + ' items)</span><span>' + money(t.sub) + '</span></div>' +
      (t.discount ? '<div class="ln" style="color:var(--ok)"><span>Coupon discount</span><span>-' + money(t.discount) + '</span></div>' : '') +
      '<div class="ln"><span>Delivery</span><span>' + (t.ship ? money(t.ship) : '<b style="color:var(--ok)">FREE</b>') + '</span></div><div class="ln tot"><span>Total</span><span>' + money(t.total) + '</span></div>' +
      (save + t.discount > 0 ? '<p style="color:var(--ok);font-weight:600;font-size:13px">You save ' + money(save + t.discount) + ' on this order</p>' : '') +
      (t.ship ? '<p class="small" style="background:#fff3cd;border-radius:8px;padding:8px 10px;margin:8px 0">Add items worth <b>' + money(s.freeAbove - net) + '</b> more for <b>FREE delivery</b> (orders of ' + money(s.freeAbove) + ' and above). Delivery below that is ' + money(s.shipFee) + '.</p>' : '<p class="small" style="color:var(--ok);font-weight:600">You get free delivery on this order.</p>') +
      '<div id="sumbtn">' + (H.hash.indexOf('checkout') < 0 ? '<a class="btn acc block" href="#/checkout">Proceed to checkout</a>' : '') + '</div></div>';
  }

  var chk = { addrIdx: -1, pay: 'COD' };
  function checkout() {
    var items = OG.cartItems(); if (!items.length) { setTimeout(function () { H.hash = '#/cart'; }, 0); return ''; }
    var u = OG.session(), cc = cartCalc(), t = cc.t, s = OG.settings(), addrs = u.addresses || [];
    if (chk.addrIdx >= addrs.length) chk.addrIdx = -1;
    if (chk.addrIdx === -1 && addrs.length && !chk.touched) chk.addrIdx = 0;
    var form = chk.addrIdx === -1;
    return '<h1 style="margin:20px 0 0;font-size:28px">Checkout</h1><div class="two"><div>' +
      '<div class="card" style="padding:16px;margin-bottom:14px"><h3 style="font-size:18px;margin-bottom:10px">1. Delivery address</h3>' +
      addrs.map(function (a, i) {
        return '<label class="addr ' + (chk.addrIdx === i ? 'on' : '') + '"><input type="radio" name="ad" data-act="pickaddr" data-i="' + i + '" ' + (chk.addrIdx === i ? 'checked' : '') + '><div><b>' + esc(a.name) + '</b> <span class="chip">' + esc(a.type) + '</span><div class="small">' + esc(a.line) + (a.area ? ', ' + esc(a.area) : '') + ', ' + esc(a.city) + ', ' + esc(a.state) + ' - ' + esc(a.pin) + '</div><div class="small muted">Phone: ' + esc(a.phone) + (a.landmark ? ' &middot; Landmark: ' + esc(a.landmark) : '') + '</div></div></label>';
      }).join('') +
      (addrs.length ? '<label class="addr ' + (form ? 'on' : '') + '"><input type="radio" name="ad" data-act="pickaddr" data-i="-1" ' + (form ? 'checked' : '') + '><div><b>+ Add a new address</b></div></label>' : '') +
      (form ? '<form id="af" style="margin-top:10px"><div class="row c2"><div class="fg"><label>Full name *</label><input name="name" value="' + esc(u.name) + '" autocomplete="name"></div><div class="fg"><label>Mobile number *</label><input name="phone" value="' + esc(u.phone) + '" inputmode="numeric" maxlength="10" autocomplete="tel"></div></div>' +
        '<div class="row c2"><div class="fg"><label>Pincode *</label><input name="pin" inputmode="numeric" maxlength="6" placeholder="6-digit pincode" autocomplete="postal-code"></div><div class="fg"><label>Locality / Area *</label><input name="area" placeholder="Area, colony, street" list="areas"><datalist id="areas"></datalist></div></div>' +
        '<div class="fg"><label>Flat / House no. / Building / Company *</label><input name="line" autocomplete="address-line1"></div>' +
        '<div class="row c2"><div class="fg"><label>City / District *</label><input name="city"></div><div class="fg"><label>State *</label><input name="state"></div></div>' +
        '<div class="fg"><label>Landmark (optional)</label><input name="landmark" placeholder="Near temple, school, etc."></div>' +
        '<div class="fg"><label>Address type</label><div style="display:flex;gap:8px"><label class="opt" style="margin:0;padding:8px 14px"><input type="radio" name="type" value="Home" checked> Home</label><label class="opt" style="margin:0;padding:8px 14px"><input type="radio" name="type" value="Work"> Work / College</label></div></div>' +
        '<div class="small muted" id="pinmsg"></div></form>' : '') + '<div class="err" id="ce"></div></div>' +
      '<div class="card" style="padding:16px;margin-bottom:14px"><h3 style="font-size:18px;margin-bottom:10px">2. Payment</h3>' +
      '<label class="opt ' + (chk.pay === 'COD' ? 'on' : '') + '"><input type="radio" name="pay" data-act="pay" data-v="COD" ' + (chk.pay === 'COD' ? 'checked' : '') + '><div><b>Cash on Delivery</b><div class="small muted">Pay in cash when your order arrives</div></div></label>' +
      '<label class="opt ' + (chk.pay === 'UPI' ? 'on' : '') + '"><input type="radio" name="pay" data-act="pay" data-v="UPI" ' + (chk.pay === 'UPI' ? 'checked' : '') + '><div><b>UPI on Delivery / Pay after confirmation</b><div class="small muted">We will share a UPI request on ' + esc(s.phone) + ' after your order is accepted</div></div></label></div>' +
      '<div class="card" style="padding:16px"><h3 style="font-size:18px;margin-bottom:10px">3. Order note (optional)</h3><textarea id="note" rows="2" placeholder="Any special instruction, project deadline, etc."></textarea></div></div>' +
      summary(items, t, s, cc) + '</div>';
  }
  function afterCheckout() {
    var sb = $('#sumbtn'); if (sb) sb.innerHTML = '<button class="btn acc block" data-act="place" style="margin-top:8px">Place order</button><p class="muted small" style="margin-top:8px">By placing the order you agree it is accepted automatically and can be cancelled until it is dispatched.</p>';
    var f = $('#af'); if (!f) return;
    function pm(t) { var m = $('#pinmsg'); if (m) m.textContent = t; }
    f.pin.addEventListener('input', function () {
      var v = f.pin.value.replace(/\D/g, '').slice(0, 6); f.pin.value = v;
      if (v.length === 6) {
        pm('Looking up pincode...');
        fetch('https://api.postalpincode.in/pincode/' + v).then(function (r) { return r.json(); }).then(function (j) {
          var d = j && j[0];
          if (d && d.Status === 'Success' && d.PostOffice && d.PostOffice.length) {
            var po = d.PostOffice; f.city.value = po[0].District; f.state.value = po[0].State;
            $('#areas').innerHTML = po.map(function (x) { return '<option value="' + esc(x.Name) + '">'; }).join(''); if (!f.area.value) f.area.value = po[0].Name;
            pm('Delivering to ' + po[0].District + ', ' + po[0].State);
          } else pm('Pincode not found. Please fill city and state manually.');
        }).catch(function () { pm('Could not look up pincode. Please fill city and state manually.'); });
      } else pm('');
    });
  }
  function readAddr() {
    var u = OG.session();
    if (chk.addrIdx >= 0) return { a: u.addresses[chk.addrIdx] };
    var f = $('#af'); if (!f) return { err: 'Please add a delivery address.' };
    var a = { name: f.name.value.trim(), phone: OG.normPhone(f.phone.value), pin: f.pin.value.trim(), area: f.area.value.trim(), line: f.line.value.trim(), city: f.city.value.trim(), state: f.state.value.trim(), landmark: f.landmark.value.trim(), type: f.type.value };
    if (!a.name) return { err: 'Please enter the recipient name.' };
    if (!/^[6-9]\d{9}$/.test(a.phone)) return { err: 'Please enter a valid 10-digit mobile number.' };
    if (!/^\d{6}$/.test(a.pin)) return { err: 'Please enter a valid 6-digit pincode.' };
    if (!a.area) return { err: 'Please enter your locality / area.' };
    if (!a.line) return { err: 'Please enter your flat / house number.' };
    if (!a.city || !a.state) return { err: 'Please enter city and state.' };
    return { a: a, isNew: true };
  }
  function place() {
    var u = OG.session(), cc = cartCalc(), items = cc.items, r = readAddr(), e = $('#ce');
    if (cc.msg) { applyMsg = cc.msg + ' The coupon was removed, please review your total.'; reroute(); return; }
    if (r.err) { e.textContent = r.err; e.scrollIntoView({ block: 'center' }); return; }
    for (var i = 0; i < items.length; i++) {
      var p = OG.product(items[i].id);
      if (!p || p.stock < items[i].qty) { e.textContent = '"' + items[i].name + '" does not have enough stock. Please update your cart.'; return; }
    }
    if (r.isNew) { u.addresses = (u.addresses || []).filter(function (x) { return !(x.pin === r.a.pin && x.line === r.a.line); }); u.addresses.unshift(r.a); OG.saveUser(u); }
    var o = OG.placeOrder({ email: u.email, name: u.name, phone: u.phone, items: items, address: r.a, payment: chk.pay === 'COD' ? 'Cash on Delivery' : 'UPI', note: ($('#note') || {}).value || '', totals: cc.t, coupon: cc.cr ? { code: cc.cr.code, amount: cc.cr.amount } : null });
    OG.notify('New order ' + o.id + ' - ' + money(o.totals.total), OG.orderText(o));
    chk = { addrIdx: -1, pay: 'COD' };
    H.hash = '#/done/' + o.id;
  }

  function done(id) {
    var o = OG.order(id); if (!o) return '<div class="empty">Order not found.</div>';
    var s = OG.settings();
    return '<div class="success"><div class="tick">✓</div><h1 style="font-size:30px">Order placed and accepted!</h1><p class="muted">Order <b>' + o.id + '</b> &middot; ' + money(o.totals.total) + ' &middot; ' + esc(o.payment) + '</p>' +
      '<p style="max-width:520px;margin:10px auto">Your order was accepted automatically. We will pack and dispatch it soon. You can cancel it from <b>Orders</b> until it is dispatched.</p>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px"><a class="btn acc" href="#/o/' + o.id + '">Track order</a><a class="btn ghost" href="#/shop">Continue shopping</a>' +
      '<a class="btn ok" target="_blank" rel="noopener" href="https://wa.me/91' + esc(s.phone) + '?text=' + encodeURIComponent(OG.orderText(o)) + '">Send details on WhatsApp</a></div></div>';
  }

  function stepper(o) {
    var flow = ['Placed'].concat(OG.FLOW), idx = flow.indexOf(o.status), cx = o.status === 'Cancelled';
    if (cx) return '<div class="steps"><div class="step done"><i>✓</i>Placed</div><div class="step cx done"><i>✕</i>Cancelled</div></div>';
    return '<div class="steps">' + flow.map(function (s, i) {
      var h = o.history.filter(function (x) { return x.s === s; })[0];
      return '<div class="step ' + (i <= idx ? 'done' : '') + (i === idx ? ' cur' : '') + '"><i>' + (i <= idx ? '✓' : '') + '</i>' + s + (h ? '<div class="muted" style="font-size:10.5px">' + new Date(h.t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function orderCard(o, detail) {
    var canc = OG.CANCELLABLE.indexOf(o.status) >= 0, a = o.address;
    return '<div class="card ord"><div class="hd"><div><b>Order ' + o.id + '</b><div class="small muted">' + dt(o.created) + ' &middot; ' + esc(o.payment) + '</div></div><div style="text-align:right"><span class="chip ' + chipCls(o.status) + '">' + o.status + '</span><div><b>' + money(o.totals.total) + '</b></div></div></div>' +
      o.items.map(function (i) { var p = OG.product(i.id); return '<div style="display:flex;gap:10px;align-items:center;padding:6px 0"><img style="width:48px;height:48px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:8px" src="' + OG.img(p || { id: i.id, cat: i.cat || 'misc', name: i.name }) + '" alt=""><div style="flex:1"><a href="#/p/' + i.id + '" class="small" style="font-weight:600">' + esc(i.name) + '</a><div class="small muted">Qty ' + i.qty + ' &times; ' + money(i.price) + '</div></div></div>'; }).join('') +
      stepper(o) +
      (detail ? '<div class="row c2" style="margin-top:10px"><div><b class="small">Delivery address</b><div class="small">' + esc(a.name) + ', ' + esc(a.line) + (a.area ? ', ' + esc(a.area) : '') + ', ' + esc(a.city) + ', ' + esc(a.state) + ' - ' + esc(a.pin) + '<br>Phone: ' + esc(a.phone) + '</div></div><div><b class="small">Price</b><div class="small">Items ' + money(o.totals.sub) + (o.totals.discount ? '<br>Discount -' + money(o.totals.discount) + (o.coupon ? ' (' + esc(o.coupon.code) + ')' : '') : '') + '<br>Delivery ' + (o.totals.ship ? money(o.totals.ship) : 'FREE') + '<br><b>Total ' + money(o.totals.total) + '</b></div></div></div>' +
        (o.courier ? '<p class="small"><b>Courier:</b> ' + esc(o.courier) + (o.trackingId ? ' &middot; Tracking ID: ' + esc(o.trackingId) : '') + '</p>' : '') +
        '<h4 style="margin:12px 0 4px">Order history</h4>' + o.history.slice().reverse().map(function (h) { return '<div class="small"><b>' + h.s + '</b> &middot; ' + dt(h.t) + (h.note ? ' <span class="muted">(' + esc(h.note) + ')</span>' : '') + '</div>'; }).join('') : '') +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' + (detail ? '' : '<a class="btn sm ghost" href="#/o/' + o.id + '">View details</a>') +
      (canc ? '<button class="btn sm bad" data-act="cancel" data-id="' + o.id + '">Cancel order</button>' : '') +
      (o.status === 'Delivered' ? '<a class="btn sm acc" href="#/p/' + o.items[0].id + '">Write a review</a>' : '') + '</div>' +
      (!canc && o.status !== 'Cancelled' && o.status !== 'Delivered' ? '<p class="small muted" style="margin-top:8px">This order has been dispatched, so it can no longer be cancelled. Call ' + esc(OG.settings().phone) + ' for help.</p>' : '') + '</div>';
  }
  function orders() {
    var u = OG.session(), list = OG.myOrders(u.email);
    return '<h1 style="margin:20px 0 14px;font-size:28px">My orders</h1>' + (list.length ? list.map(function (o) { return orderCard(o, false); }).join('') : '<div class="empty"><h3>No orders yet</h3><a class="btn acc" href="#/shop">Start shopping</a></div>');
  }
  function orderPage(id) {
    var u = OG.session(), o = OG.order(id);
    if (!o || o.email !== u.email) return '<div class="empty"><h3>Order not found</h3><a class="btn" href="#/orders">My orders</a></div>';
    return '<div class="crumbs"><a href="#/orders">My orders</a> / ' + o.id + '</div><div style="margin-top:12px">' + orderCard(o, true) + '</div>';
  }

  function projects() {
    var list = OG.products().filter(function (p) { return p.cat === 'projects'; }), u = OG.session(), mine = OG.requests().filter(function (r) { return r.email === u.email; }).reverse();
    return '<section class="hero" style="grid-template-columns:1fr"><div><h1>Custom projects, built for you</h1><p>B.Tech, Diploma and AI projects made to order: hardware, code, circuit diagram, report, PPT and viva support.</p></div></section>' +
      '<div class="two" style="grid-template-columns:1fr 380px"><div><h2 style="font-size:24px;margin-bottom:12px">Ready-made projects</h2><div class="grid">' + list.map(card).join('') + '</div></div>' +
      '<div><form id="pf" class="card" style="padding:16px;position:sticky;top:112px"><h3 style="font-size:20px;margin-bottom:10px">Request a custom project</h3>' +
      '<div class="fg"><label>Project title / idea *</label><input name="title" placeholder="e.g. Smart attendance using face recognition"></div>' +
      '<div class="row c2"><div class="fg"><label>Level</label><select name="level"><option>B.Tech</option><option>Diploma</option><option>M.Tech</option><option>School</option><option>Other</option></select></div><div class="fg"><label>Budget (₹)</label><input name="budget" type="number" min="0" placeholder="Approx."></div></div>' +
      '<div class="fg"><label>Deadline</label><input name="deadline" type="date"></div><div class="fg"><label>Details</label><textarea name="details" rows="4" placeholder="Components, features, college guidelines..."></textarea></div>' +
      '<div class="err" id="pe"></div><button class="btn acc block">Send request</button></form>' +
      (mine.length ? '<div class="card" style="padding:14px;margin-top:14px"><b>Your requests</b>' + mine.map(function (r) { return '<div class="small" style="padding:6px 0;border-top:1px solid var(--line);margin-top:6px">' + esc(r.title) + ' <span class="chip ' + r.status + '">' + r.status + '</span>' + (r.reply ? '<div class="muted">Reply: ' + esc(r.reply) + '</div>' : '') + '</div>'; }).join('') + '</div>' : '') + '</div></div>';
  }
  function account() {
    var u = OG.session();
    return '<h1 style="margin:20px 0 14px;font-size:28px">My account</h1><div class="card" style="padding:18px;max-width:520px"><p><b>' + esc(u.name) + '</b></p><p class="muted">' + esc(u.email) + '<br>' + esc(u.phone) + '</p><p class="small muted">Saved addresses: ' + (u.addresses || []).length + '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn ghost sm" href="#/orders">My orders</a><button class="btn bad sm" data-act="logout">Log out</button></div></div>';
  }

  /* ---------- Cancel modal ---------- */
  function cancelModal(id) {
    $('#modal').innerHTML = '<div class="ov"><div class="mod"><h2 style="font-size:22px;margin-bottom:6px">Cancel order ' + id + '?</h2><p class="muted small">Tell us why. Stock is released and the order will be marked cancelled.</p>' +
      '<div class="fg" style="margin-top:12px"><label>Reason</label><select id="cr"><option>Ordered by mistake</option><option>Found a better price</option><option>Need to change items or address</option><option>Delivery will take too long</option><option>No longer need it</option><option>Other</option></select></div>' +
      '<div class="fg"><textarea id="ct" rows="2" placeholder="Anything else? (optional)"></textarea></div><div class="err" id="cer"></div>' +
      '<div style="display:flex;gap:8px"><button class="btn bad" style="flex:1" data-act="cancel-yes" data-id="' + id + '">Yes, cancel order</button><button class="btn ghost" style="flex:1" data-act="close">Keep order</button></div></div></div>';
  }

  /* ---------- Router ---------- */
  function route() {
    if (!OG.session()) { gate(); return; }
    var h = H.hash.replace(/^#/, '') || '/', path = h.split('?')[0], html = '', after = null;
    if (path === '/' || path === '') html = home();
    else if (path === '/shop') html = shop();
    else if (path.indexOf('/p/') === 0) html = product(path.slice(3));
    else if (path === '/cart') html = cart();
    else if (path === '/checkout') { html = checkout(); after = afterCheckout; }
    else if (path.indexOf('/done/') === 0) html = done(path.slice(6));
    else if (path === '/orders') html = orders();
    else if (path.indexOf('/o/') === 0) html = orderPage(path.slice(3));
    else if (path === '/projects') html = projects();
    else if (path === '/account') html = account();
    else html = '<div class="empty"><h3>Page not found</h3><a class="btn" href="#/">Home</a></div>';
    app.innerHTML = html; if (after) after();
    var ql = $('#q'); if (ql && path !== '/shop') ql.value = ''; else if (ql && path === '/shop') ql.value = parseQ().q || '';
    cartBadge();
    window.scrollTo(0, 0);
    var sel = $('#sort'); if (sel) sel.onchange = function () { var q = parseQ(); q.sort = sel.value; delete q.page; H.hash = '#/shop?' + qs(q); };
  }

  /* ---------- Events ---------- */
  var pqty = 1;
  document.addEventListener('click', function (e) {
    var lk = e.target.closest('a[href^="#/"]'); if (lk) { e.preventDefault(); H.hash = lk.getAttribute('href'); return; }
    var go = e.target.closest('[data-go]'); if (go) { H.hash = go.dataset.go; return; }
    var t = e.target.closest('[data-act]'); if (!t) return;
    var act = t.dataset.act, id = t.dataset.id;
    if (t.tagName === 'A') e.preventDefault();
    if (act === 'add') { OG.cartAdd(id); cartBadge(); toast('Added to cart'); }
    else if (act === 'q-') { pqty = Math.max(1, pqty - 1); $('#pq').textContent = pqty; }
    else if (act === 'q+') { pqty = Math.min(+t.dataset.max, pqty + 1); $('#pq').textContent = pqty; }
    else if (act === 'addq') { OG.cartAdd(id, pqty); cartBadge(); toast('Added ' + pqty + ' to cart'); }
    else if (act === 'buy') { OG.cartAdd(id, pqty); H.hash = '#/checkout'; }
    else if (act === 'cq') { var c = OG.cart().filter(function (x) { return x.id === id; })[0], p = OG.product(id); OG.cartSet(id, Math.min(p.stock, c.qty + (+t.dataset.d))); route(); }
    else if (act === 'crm') { OG.cartSet(id, 0); route(); }
    else if (act === 'pickaddr') { chk.addrIdx = +t.dataset.i; chk.touched = true; route(); }
    else if (act === 'pay') { chk.pay = t.dataset.v; var n = $('#note'); var v = n ? n.value : ''; route(); if ($('#note')) $('#note').value = v; }
    else if (act === 'place') place();
    else if (act === 'cancel') cancelModal(id);
    else if (act === 'cancel-yes') {
      var reason = $('#cr').value + ($('#ct').value.trim() ? ' - ' + $('#ct').value.trim() : ''), r = OG.cancelOrder(id, reason, 'customer');
      if (r.error) { $('#cer').textContent = r.error; return; }
      OG.notify('Order cancelled ' + id, OG.orderText(r.order) + '\nCancel reason: ' + reason);
      $('#modal').innerHTML = ''; toast('Order cancelled'); route();
    }
    else if (act === 'close') $('#modal').innerHTML = '';
    else if (act === 'applycoupon') {
      var code = t.dataset.code || ($('#cpn') ? $('#cpn').value : ''), u3 = OG.session(), rr = OG.couponApply(code, OG.cartItems(), u3 ? u3.email : '');
      if (rr.error) applyMsg = rr.error; else { OG.ls.set('coupon', rr.code); toast('Coupon ' + rr.code + ' applied. You save ' + money(rr.amount)); }
      reroute();
    }
    else if (act === 'rmcoupon') { OG.ls.del('coupon'); reroute(); }
    else if (act === 'applyprice') { var q = parseQ(); q.min = $('#pmin').value; q.max = $('#pmax').value; q.stock = $('#pst').checked ? '1' : ''; delete q.page; H.hash = '#/shop?' + qs(q); }
    else if (act === 'toggleflt') $('#flt').classList.toggle('open');
    else if (act === 'logout') { OG.logOut(); H.hash = '#/'; chrome(); route(); }
    else if (act === 'admin-out') { e.preventDefault(); OG.adminLogout(); chrome(); }
    else if (act === 'admin-open') { e.preventDefault(); if (window.OGAdmin) OGAdmin.open(); }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'rf') {
      e.preventDefault(); var u = OG.session(), txt = f.text.value.trim();
      if (txt.length < 5) { $('#re').textContent = 'Please write a few words about the product.'; return; }
      OG.addReview({ pid: f.dataset.id, email: u.email, name: u.name, rating: +f.rating.value, text: txt });
      toast('Thanks for your review!'); route();
    } else if (f.id === 'pf') {
      e.preventDefault(); var u2 = OG.session();
      if (f.title.value.trim().length < 4) { $('#pe').textContent = 'Please describe your project idea.'; return; }
      var r = OG.addRequest({ email: u2.email, name: u2.name, phone: u2.phone, title: f.title.value.trim(), level: f.level.value, budget: f.budget.value, deadline: f.deadline.value, details: f.details.value.trim() });
      OG.notify('New custom project request: ' + r.title, 'From: ' + u2.name + ' | ' + u2.phone + ' | ' + u2.email + '\nLevel: ' + r.level + ' | Budget: ' + (r.budget || '-') + ' | Deadline: ' + (r.deadline || '-') + '\n' + r.details);
      toast('Request sent. We will contact you soon.'); route();
    }
  });
  $('#modal').addEventListener('click', function (e) { if (e.target.classList.contains('ov') && OG.session()) $('#modal').innerHTML = ''; });

  window.OG_refresh = function () { chrome(); route(); };
  function adminHash() { if (location.hash === '#admin' && window.OGAdmin) OGAdmin.open(); }
  window.addEventListener('hashchange', adminHash);

  /* ---------- Boot ---------- */
  OG.ready.then(function () {
    chrome();
    var u = OG.session();
    var seen = false; try { seen = sessionStorage.getItem('og_vis'); } catch (e) {}
    if (u && !seen) visited(u, 'Visit');
    route();
    adminHash();
  });
})();
