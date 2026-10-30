/* OhmGo Admin Panel */
(function () {
  var esc = OG.esc, money = OG.money;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var root = $('#adminroot'), view = 'dash', pst = { q: '', cat: '', page: 1, hidden: '' }, ofil = 'all', lastCount = 0;
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800); }
  function dt(t) { return new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  function chipCls(s) { return s === 'Out for Delivery' ? 'Out' : s; }
  function beep() { try { var c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = .15; o.start(); setTimeout(function () { o.stop(); c.close(); }, 250); } catch (e) {} }

  /* In-page dialogs (the published viewer blocks prompt() and confirm()). */
  function dlg(html, onSubmit) {
    $('#amodal').innerHTML = '<div class="ov"><div class="mod"><form id="dlgf">' + html + '<div class="err" id="dlge"></div></form></div></div>';
    var f = $('#dlgf');
    f.onsubmit = function (e) { e.preventDefault(); var r = onSubmit(f); if (typeof r === 'string') { $('#dlge').textContent = r; return; } $('#amodal').innerHTML = ''; };
    var first = $('#dlgf input:not([type=checkbox]),#dlgf select'); if (first) first.focus();
  }
  function askConfirm(title, msg, label, cb) {
    dlg('<h2 style="font-size:20px;margin-bottom:6px">' + esc(title) + '</h2><p class="muted small">' + esc(msg) + '</p><div style="display:flex;gap:8px;margin-top:14px"><button class="btn bad" style="flex:1">' + esc(label || 'Confirm') + '</button><button type="button" class="btn ghost" style="flex:1" data-act="close">Cancel</button></div>', function () { cb(); });
  }

  /* ---------- Gate ---------- */
  function gate() {
    var setup = !OG.adminSetupDone();
    root.innerHTML = '<div class="ov" style="position:static;min-height:100vh;background:#1c1a17"><div class="mod"><img class="logo" src="logo.svg" alt="OhmGo"><h2 style="text-align:center;font-size:22px">' + (setup ? 'Set up admin access' : 'Admin login') + '</h2>' +
      '<p class="muted small" style="text-align:center;margin:6px 0 14px">' + (setup ? 'Choose a password (8+ characters) for the owner account.' : 'Only the OhmGo owner can open this page.') + '</p>' +
      '<form id="af"><div class="fg"><label>Owner email</label><input name="email" type="email" value="' + esc(OG.settings().adminEmail) + '" autocomplete="username"></div><div class="fg"><label>Password</label><input name="pw" type="password" autocomplete="' + (setup ? 'new-password' : 'current-password') + '"></div>' +
      (setup ? '<div class="fg"><label>Confirm password</label><input name="pw2" type="password" autocomplete="new-password"></div>' : '') +
      '<div class="err" id="ae"></div><button class="btn acc block">' + (setup ? 'Create admin account' : 'Log in') + '</button></form><p class="small" style="text-align:center;margin-top:12px"><button type="button" class="btn sm ghost" data-act="back">Back to store</button></p></div></div>';
    $('#af').onsubmit = function (e) {
      e.preventDefault(); var f = e.target;
      if (setup && f.pw.value !== f.pw2.value) { $('#ae').textContent = 'Passwords do not match.'; return; }
      (setup ? OG.adminSetup(f.email.value, f.pw.value) : OG.adminLogin(f.email.value, f.pw.value)).then(function (r) {
        if (r.error) $('#ae').textContent = r.error; else start();
      });
    };
  }

  /* ---------- Shell ---------- */
  function newOrders() { return OG.orders().filter(function (o) { return !o.seen && o.status !== 'Cancelled'; }).length; }
  function shell() {
    var nO = newOrders(), nR = OG.requests().filter(function (r) { return r.status === 'New'; }).length;
    var tabs = [['dash', 'Dashboard'], ['orders', 'Orders', nO], ['products', 'Products'], ['discounts', 'Discounts'], ['projects', 'Projects', nR], ['reviews', 'Reviews'], ['customers', 'Customers'], ['settings', 'Settings']];
    root.innerHTML = '<div class="abar"><div class="in"><span class="tag">ADMIN</span><h1>OhmGo Admin Panel</h1><span class="sp"></span><button class="btn sm ghost" style="color:#fff;border-color:#fff" data-act="back">View store</button><button class="btn sm" style="background:#1c1a17" data-act="out">Log out</button></div></div>' +
      '<div class="anav">' + tabs.map(function (t) { return '<button data-v="' + t[0] + '" class="' + (view === t[0] ? 'on' : '') + '">' + t[1] + (t[2] ? '<span class="badge">' + t[2] + '</span>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="aw"><div class="newbanner" id="nb"></div><div id="pane"></div></div>';
    root.querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { view = b.dataset.v; shell(); render(); }; });
    banner();
  }
  function banner() {
    var n = newOrders(), b = $('#nb'); if (!b) return;
    if (n) { b.style.display = 'flex'; b.innerHTML = '🔔 ' + n + ' new order' + (n > 1 ? 's' : '') + ' received and auto-accepted. <button class="btn sm acc" data-act="seen">Mark as seen</button>'; } else b.style.display = 'none';
  }
  function render() {
    var p = $('#pane'); if (!p) return;
    p.innerHTML = ({ dash: dash, orders: orders, products: products, discounts: discounts, projects: projects, reviews: reviews, customers: customers, settings: settings })[view]();
    if (view === 'settings') bindSettings();
    if (view === 'discounts') bindDiscounts();
  }

  /* ---------- Dashboard ---------- */
  function dash() {
    var o = OG.orders(), live = o.filter(function (x) { return x.status !== 'Cancelled'; }), rev = live.reduce(function (a, x) { return a + x.totals.total; }, 0);
    var pend = o.filter(function (x) { return ['Accepted', 'Packed'].indexOf(x.status) >= 0; }).length;
    var cx = o.filter(function (x) { return x.status === 'Cancelled'; }).length, all = OG.products(true), low = all.filter(function (p) { return p.stock <= 5; });
    var vis = OG.visits().slice().reverse().slice(0, 15), ob = OG.outbox(), emailOk = OG.settings().emailjs.service;
    return (emailOk ? '' : '<div class="warn"><b>Email alerts are not set up yet.</b> Open <a href="#" data-v2="settings" style="color:var(--acc);font-weight:700">Settings</a> and add your EmailJS keys so you get an email when customers visit, order or cancel.</div>') +
      '<div class="warn"><b>Important:</b> this site stores data in the browser it runs in. Orders placed on a customer\'s phone are not visible here unless a shared backend is connected. Email alerts (and the WhatsApp button shown to customers after ordering) carry the full order details to you in the meantime.</div>' +
      '<div class="stats"><div class="card stat"><b>' + o.length + '</b><span>Total orders</span></div><div class="card stat"><b>' + money(rev) + '</b><span>Sales (excl. cancelled)</span></div><div class="card stat"><b>' + pend + '</b><span>To pack / dispatch</span></div><div class="card stat"><b>' + cx + '</b><span>Cancelled</span></div><div class="card stat"><b>' + all.length.toLocaleString('en-IN') + '</b><span>Products</span></div><div class="card stat"><b>' + Object.keys(OG.users()).length + '</b><span>Customers</span></div><div class="card stat"><b>' + money(OG.orders().filter(function (o) { return o.status !== 'Cancelled'; }).reduce(function (a, o) { return a + (o.totals.discount || 0); }, 0)) + '</b><span>Coupon discounts given</span></div></div>' +
      '<div class="two" style="grid-template-columns:1fr 1fr"><div class="card" style="padding:14px"><h3 style="margin-bottom:8px">Recent visitors</h3>' + (vis.length ? vis.map(function (v) { return '<div class="small" style="padding:5px 0;border-bottom:1px solid var(--line)"><b>' + esc(v.name) + '</b> <span class="chip">' + esc(v.kind) + '</span><br><span class="muted">' + esc(v.email) + ' &middot; ' + esc(v.phone) + ' &middot; ' + dt(v.t) + '</span></div>'; }).join('') : '<p class="muted small">No visitors recorded yet.</p>') + '</div>' +
      '<div class="card" style="padding:14px"><h3 style="margin-bottom:8px">Low stock (5 or fewer)</h3>' + (low.length ? low.slice(0, 15).map(function (p) { return '<div class="small" style="padding:5px 0;border-bottom:1px solid var(--line)">' + esc(p.name) + ' <b style="color:var(--bad)">' + p.stock + ' left</b></div>'; }).join('') + (low.length > 15 ? '<p class="muted small">and ' + (low.length - 15) + ' more</p>' : '') : '<p class="muted small">Nothing is running low.</p>') +
      '<h3 style="margin:14px 0 8px">Email log</h3>' + (ob.length ? ob.slice().reverse().slice(0, 6).map(function (m) { return '<div class="small" style="padding:4px 0;border-bottom:1px solid var(--line)">' + (m.sent ? '✅' : '⚠️') + ' ' + esc(m.subject) + ' <span class="muted">' + dt(m.t) + (m.err ? ' &middot; ' + esc(m.err) : '') + '</span></div>'; }).join('') : '<p class="muted small">No emails yet.</p>') + '</div></div>';
  }

  /* ---------- Orders ---------- */
  function nextOf(s) { var i = OG.FLOW.indexOf(s); return i >= 0 && i < OG.FLOW.length - 1 ? OG.FLOW[i + 1] : null; }
  function orders() {
    var list = OG.orders().slice().sort(function (a, b) { return b.created - a.created; });
    var sts = ['all'].concat(OG.FLOW, ['Cancelled']);
    if (ofil !== 'all') list = list.filter(function (o) { return o.status === ofil; });
    return '<div class="tb">' + sts.map(function (s) { return '<button class="btn sm ' + (ofil === s ? '' : 'ghost') + '" data-act="ofil" data-s="' + s + '">' + (s === 'all' ? 'All' : s) + ' (' + OG.orders().filter(function (o) { return s === 'all' || o.status === s; }).length + ')</button>'; }).join('') + '</div>' +
      (list.length ? list.map(function (o) {
        var nx = nextOf(o.status), a = o.address;
        return '<div class="card ocard"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>' + o.id + '</b> <span class="chip ' + chipCls(o.status) + '">' + o.status + '</span><div class="small muted">' + dt(o.created) + ' &middot; ' + esc(o.payment) + '</div></div><b style="font-size:18px">' + money(o.totals.total) + '</b></div>' +
          '<div class="row c2" style="margin:10px 0"><div class="small"><b>' + esc(o.name) + '</b><br>' + esc(o.phone) + '<br>' + esc(o.email) + '</div><div class="small"><b>Ship to</b> (' + esc(a.type) + ')<br>' + esc(a.name) + ', ' + esc(a.line) + (a.area ? ', ' + esc(a.area) : '') + ', ' + esc(a.city) + ', ' + esc(a.state) + ' - <b>' + esc(a.pin) + '</b>' + (a.landmark ? '<br>Landmark: ' + esc(a.landmark) : '') + '<br>Phone: ' + esc(a.phone) + '</div></div>' +
          '<div class="small">' + o.items.map(function (i) { return esc(i.name) + ' &times; ' + i.qty + ' = ' + money(i.price * i.qty); }).join('<br>') + '</div><div class="small muted" style="margin-top:4px">Items ' + money(o.totals.sub) + (o.totals.discount ? ' &middot; Coupon ' + esc(o.coupon ? o.coupon.code : '') + ' -' + money(o.totals.discount) : '') + ' &middot; Delivery ' + (o.totals.ship ? money(o.totals.ship) : 'Free') + '</div>' + (o.note ? '<p class="small"><b>Note:</b> ' + esc(o.note) + '</p>' : '') +
          (o.cancelReason ? '<p class="small" style="color:var(--bad)"><b>Cancelled (' + esc(o.cancelledBy) + '):</b> ' + esc(o.cancelReason) + '</p>' : '') +
          (o.status !== 'Cancelled' && o.status !== 'Delivered' ? '<div class="row c2" style="margin-top:10px"><input placeholder="Courier (e.g. DTDC, India Post)" data-f="courier" data-id="' + o.id + '" value="' + esc(o.courier || '') + '"><input placeholder="Tracking ID" data-f="trackingId" data-id="' + o.id + '" value="' + esc(o.trackingId || '') + '"></div>' : '') +
          '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' + (nx ? '<button class="btn sm ok" data-act="advance" data-id="' + o.id + '" data-s="' + nx + '">Mark ' + nx + '</button>' : '') +
          (o.status !== 'Cancelled' && o.status !== 'Delivered' ? '<button class="btn sm bad" data-act="acancel" data-id="' + o.id + '">Cancel order</button>' : '') +
          '<a class="btn sm ghost" target="_blank" rel="noopener" href="https://wa.me/91' + esc(o.phone) + '?text=' + encodeURIComponent('Hi ' + o.name + ', update on your OhmGo order ' + o.id + ': ' + o.status + '.' + (o.trackingId ? ' Tracking: ' + o.trackingId + (o.courier ? ' (' + o.courier + ')' : '') : '')) + '">WhatsApp customer</a></div>' +
          '<details style="margin-top:8px"><summary class="small muted" style="cursor:pointer">History</summary>' + o.history.map(function (h) { return '<div class="small">' + h.s + ' &middot; ' + dt(h.t) + (h.note ? ' (' + esc(h.note) + ')' : '') + '</div>'; }).join('') + '</details></div>';
      }).join('') : '<div class="empty card">No orders here yet.</div>');
  }

  /* ---------- Products ---------- */
  function products() {
    var all = OG.products(true), list = all;
    if (pst.cat) list = list.filter(function (p) { return p.cat === pst.cat; });
    if (pst.hidden === '1') list = list.filter(function (p) { return p.hidden; });
    if (pst.q) { var toks = pst.q.toLowerCase().split(/\s+/); list = list.filter(function (p) { var n = (p.name + ' ' + p.id).toLowerCase(); return toks.every(function (t) { return n.indexOf(t) >= 0; }); }); }
    var per = 30, pages = Math.max(1, Math.ceil(list.length / per)); pst.page = Math.min(pst.page, pages);
    var show = list.slice((pst.page - 1) * per, pst.page * per);
    return '<div class="tb"><input id="ps" placeholder="Search products or SKU" value="' + esc(pst.q) + '"><select id="pc"><option value="">All categories</option>' + OG.cats.map(function (c) { return '<option value="' + c.id + '"' + (pst.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<label style="margin:0;display:flex;gap:6px;align-items:center"><input type="checkbox" id="ph" style="width:auto" ' + (pst.hidden ? 'checked' : '') + '> Hidden only</label><span class="sp" style="flex:1"></span><button class="btn sm acc" data-act="addp">+ Add product / project</button><button class="btn sm" data-act="bulk">Bulk price change</button></div>' +
      '<p class="small muted">' + list.length.toLocaleString('en-IN') + ' products. Change a price, MRP or stock in the table and it saves when you leave the box. Click the photo to add or change the image.</p>' +
      '<div class="card tw"><table><thead><tr><th></th><th>Product</th><th>Category</th><th>Price ₹</th><th>Market ₹</th><th>Stock</th><th>Show</th><th></th></tr></thead><tbody>' +
      show.map(function (p) {
        return '<tr><td><img class="thumb" src="' + OG.img(p) + '" data-act="editp" data-id="' + p.id + '" style="cursor:pointer" title="Click to change image"></td><td style="min-width:240px"><b>' + esc(p.name) + '</b><div class="small muted">' + p.id + '</div></td><td class="small">' + esc(OG.cat(p.cat).name) + '</td>' +
          '<td><input type="number" min="1" data-pf="price" data-id="' + p.id + '" value="' + p.price + '"></td><td><input type="number" min="1" data-pf="mrp" data-id="' + p.id + '" value="' + p.mrp + '"></td><td><input type="number" min="0" data-pf="stock" data-id="' + p.id + '" value="' + p.stock + '"></td>' +
          '<td><input type="checkbox" style="width:auto" data-pf="show" data-id="' + p.id + '" ' + (p.hidden ? '' : 'checked') + '></td><td style="white-space:nowrap"><button class="btn sm ghost" data-act="editp" data-id="' + p.id + '">Edit</button> <button class="btn sm bad" data-act="delp" data-id="' + p.id + '">Delete</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="pager"><button data-act="pg" data-d="-1" ' + (pst.page <= 1 ? 'disabled' : '') + '>Prev</button><span style="padding:8px">Page ' + pst.page + ' of ' + pages + '</span><button data-act="pg" data-d="1" ' + (pst.page >= pages ? 'disabled' : '') + '>Next</button></div>';
  }
  function pform(p) {
    var isNew = !p; p = p || { name: '', cat: 'projects', price: '', mrp: '', stock: 10, level: 'B.Tech / Diploma', desc: '' };
    var pid = p.id || '';
    return '<div class="ov"><div class="mod wide"><h2 style="font-size:22px;margin-bottom:12px">' + (isNew ? 'Add product / project' : 'Edit product') + '</h2><form id="pfm" data-id="' + esc(pid) + '">' +
      '<div class="imgbox fg"><img id="pimg" src="' + (isNew ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#faf3df"/><text x="60" y="66" text-anchor="middle" font-size="13" fill="#7a7164" font-family="sans-serif">No image</text></svg>') : OG.img(p)) + '" alt=""><div style="flex:1;min-width:200px"><label>Product photo</label><input type="file" id="pfile" accept="image/*"><div class="small muted" style="margin:4px 0">JPG, PNG or WEBP. It is resized automatically.</div><label style="margin-top:6px">...or paste an image link</label><input id="purl" placeholder="https://..." value="' + esc(p.img || '') + '">' + (!isNew ? '<button type="button" class="btn sm ghost" style="margin-top:8px" data-act="rmimg" data-id="' + pid + '">Remove my uploaded photo</button>' : '') + '</div></div>' +
      '<div class="fg"><label>Name *</label><input name="name" value="' + esc(p.name) + '"></div><div class="row c3"><div class="fg"><label>Price ₹ *</label><input name="price" type="number" min="1" value="' + esc(p.price) + '"></div><div class="fg"><label>Market price ₹</label><input name="mrp" type="number" min="1" value="' + esc(p.mrp) + '"></div><div class="fg"><label>Stock</label><input name="stock" type="number" min="0" value="' + esc(p.stock) + '"></div></div>' +
      '<div class="row c2"><div class="fg"><label>Category</label><select name="cat">' + OG.cats.map(function (c) { return '<option value="' + c.id + '"' + (p.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div><div class="fg"><label>Level</label><input name="level" value="' + esc(p.level || '') + '" placeholder="B.Tech / Diploma / School"></div></div>' +
      '<div class="fg"><label>Description</label><textarea name="desc" rows="4">' + esc(p.desc || '') + '</textarea></div><div class="err" id="pfe"></div>' +
      '<div style="display:flex;gap:8px"><button class="btn acc" style="flex:1">Save</button><button type="button" class="btn ghost" style="flex:1" data-act="close">Cancel</button></div></form></div></div>';
  }
  var pendingImg = null;
  function openPform(p) {
    pendingImg = null; $('#amodal').innerHTML = pform(p);
    $('#pfile').onchange = function () {
      var f = this.files[0]; if (!f) return;
      OG.fileToDataUrl(f).then(function (d) { pendingImg = d; $('#pimg').src = d; $('#pfe').textContent = ''; }).catch(function (e) { $('#pfe').textContent = e.message; });
    };
    $('#pfm').onsubmit = function (e) {
      e.preventDefault(); var f = e.target, id = f.dataset.id;
      var name = f.name.value.trim(), price = Math.round(+f.price.value), mrp = Math.round(+f.mrp.value) || price, stock = Math.max(0, Math.round(+f.stock.value) || 0);
      if (!name) { $('#pfe').textContent = 'Name is required.'; return; }
      if (!(price > 0)) { $('#pfe').textContent = 'Enter a valid price.'; return; }
      var data = { name: name, price: price, mrp: Math.max(mrp, price), stock: stock, cat: f.cat.value, level: f.level.value.trim() || 'All', desc: f.desc.value.trim(), img: $('#purl').value.trim() || '' };
      data.project = data.cat === 'projects';
      var job;
      if (id) { OG.patchProduct(id, data); job = pendingImg ? OG.saveImage(id, pendingImg) : Promise.resolve(); }
      else { id = OG.addProduct(data); job = pendingImg ? OG.saveImage(id, pendingImg) : Promise.resolve(); }
      job.then(function () { $('#amodal').innerHTML = ''; toast('Saved'); render(); }).catch(function () { $('#pfe').textContent = 'Saved details, but the photo could not be stored (browser storage full or blocked).'; });
    };
  }

  /* ---------- Projects ---------- */
  function projects() {
    var req = OG.requests().slice().reverse(), list = OG.products(true).filter(function (p) { return p.cat === 'projects'; });
    return '<div class="tb"><h2 style="font-size:22px;flex:1">Custom project requests</h2></div>' +
      (req.length ? req.map(function (r) {
        return '<div class="card ocard"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>' + esc(r.title) + '</b> <span class="chip ' + r.status + '">' + r.status + '</span><div class="small muted">' + dt(r.ts) + ' &middot; ' + esc(r.level) + ' &middot; Budget ' + (r.budget ? money(r.budget) : '-') + ' &middot; Deadline ' + esc(r.deadline || '-') + '</div></div></div>' +
          '<p class="small">' + esc(r.details || '') + '</p><p class="small"><b>' + esc(r.name) + '</b> &middot; ' + esc(r.phone) + ' &middot; ' + esc(r.email) + '</p>' +
          '<div class="row c2"><input placeholder="Quote / reply to customer" data-rf="reply" data-id="' + r.id + '" value="' + esc(r.reply || '') + '"><select data-rf="status" data-id="' + r.id + '">' + ['New', 'Contacted', 'Quoted', 'In progress', 'Delivered', 'Closed'].map(function (s) { return '<option' + (r.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
          '<a class="btn sm ghost" style="margin-top:8px" target="_blank" rel="noopener" href="https://wa.me/91' + esc(r.phone) + '?text=' + encodeURIComponent('Hi ' + r.name + ', regarding your project request "' + r.title + '" at OhmGo: ') + '">WhatsApp customer</a></div>';
      }).join('') : '<div class="empty card">No requests yet.</div>') +
      '<div class="tb" style="margin-top:24px"><h2 style="font-size:22px;flex:1">Project listings in store (' + list.length + ')</h2><button class="btn sm acc" data-act="addp">+ Add project</button></div><p class="small muted">Edit prices, images and details of listed projects in the Products tab (category: Custom Projects).</p>';
  }

  /* ---------- Reviews / customers ---------- */
  function reviews() {
    var r = OG.reviews().slice().reverse();
    return '<div class="card">' + (r.length ? r.map(function (v) { var p = OG.product(v.pid); return '<div class="rev" style="display:flex;gap:12px;justify-content:space-between"><div><div class="stars">' + '★'.repeat(v.rating) + '☆'.repeat(5 - v.rating) + '</div><div>' + esc(v.text) + '</div><div class="small muted">' + esc(v.name) + ' &middot; ' + dt(v.ts) + (v.verified ? ' &middot; verified' : '') + ' &middot; on ' + esc(p ? p.name : v.pid) + '</div></div><button class="btn sm bad" data-act="delrev" data-id="' + v.id + '">Delete</button></div>'; }).join('') : '<div class="empty">No reviews yet.</div>') + '</div>';
  }
  function customers() {
    var u = Object.keys(OG.users()).map(function (k) { return OG.users()[k]; }).sort(function (a, b) { return b.created - a.created; }), o = OG.orders();
    return '<div class="card tw"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Orders</th></tr></thead><tbody>' + (u.length ? u.map(function (c) { return '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.email) + '</td><td>' + esc(c.phone) + '</td><td class="small">' + dt(c.created) + '</td><td>' + o.filter(function (x) { return x.email === c.email; }).length + '</td></tr>'; }).join('') : '<tr><td colspan="5" class="muted">No customers on this device yet.</td></tr>') + '</tbody></table></div>';
  }

  /* ---------- Discounts ---------- */
  function discounts() {
    var s = OG.settings(), list = OG.coupons();
    return '<div class="card" style="padding:16px;margin-bottom:14px;max-width:760px"><h3 style="margin-bottom:6px">Delivery charge</h3><p class="small muted">Orders at or above the free-delivery amount ship free. The amount is checked after any coupon discount. Smaller orders pay the delivery fee.</p>' +
      '<form id="delf"><div class="row c2"><div class="fg"><label>Free delivery from (₹)</label><input name="freeAbove" type="number" min="0" value="' + s.freeAbove + '"></div><div class="fg"><label>Delivery fee below that (₹)</label><input name="shipFee" type="number" min="0" value="' + s.shipFee + '"></div></div><button class="btn acc">Save delivery rule</button></form></div>' +
      '<div class="tb"><h2 style="font-size:22px;flex:1">Discount coupons</h2><button class="btn sm acc" data-act="newcpn">+ New coupon</button></div>' +
      '<p class="small muted">Customers type the code in their cart, or tap it when "Show in cart" is on. For product-wise or category-wise sales, change prices in Products or use Bulk price change.</p>' +
      '<div class="card tw"><table><thead><tr><th>Code</th><th>Offer</th><th>Used</th><th>Expires</th><th>Live</th><th></th></tr></thead><tbody>' +
      (list.length ? list.map(function (c) {
        return '<tr><td><b>' + esc(c.code) + '</b></td><td class="small">' + esc(OG.couponText(c)) + (c.perCustomer ? '<div class="muted">Once per customer</div>' : '') + '</td><td>' + (c.used || 0) + (c.limit > 0 ? ' / ' + c.limit : '') + '</td><td class="small">' + esc(c.expires || 'No expiry') + '</td>' +
          '<td><input type="checkbox" style="width:auto" data-cf="active" data-id="' + esc(c.code) + '" ' + (c.active ? 'checked' : '') + '></td><td style="white-space:nowrap"><button class="btn sm ghost" data-act="editcpn" data-id="' + esc(c.code) + '">Edit</button> <button class="btn sm bad" data-act="delcpn" data-id="' + esc(c.code) + '">Delete</button></td></tr>';
      }).join('') : '<tr><td colspan="6" class="muted">No coupons yet. Add one with the button above.</td></tr>') + '</tbody></table></div>';
  }
  function bindDiscounts() {
    var f = $('#delf'); if (!f) return;
    f.onsubmit = function (e) {
      e.preventDefault(); var s = OG.settings(), fa = Math.round(+f.freeAbove.value), fee = Math.round(+f.shipFee.value);
      if (isNaN(fa) || fa < 0 || isNaN(fee) || fee < 0) { toast('Enter valid amounts'); return; }
      s.freeAbove = fa; s.shipFee = fee; OG.saveSettings(s); toast('Delivery rule saved');
    };
  }
  function couponForm(c) {
    var isNew = !c; c = c || { code: '', type: 'percent', value: 10, min: 0, max: 0, limit: 0, used: 0, expires: '', firstOrder: false, perCustomer: false, show: true, active: true };
    dlg('<h2 style="font-size:20px;margin-bottom:10px">' + (isNew ? 'New coupon' : 'Edit coupon') + '</h2>' +
      '<div class="row c2"><div class="fg"><label>Code *</label><input name="code" value="' + esc(c.code) + '" ' + (isNew ? '' : 'readonly') + ' style="text-transform:uppercase" placeholder="e.g. DIWALI15"></div><div class="fg"><label>Type</label><select name="type"><option value="percent"' + (c.type === 'percent' ? ' selected' : '') + '>Percent off</option><option value="flat"' + (c.type === 'flat' ? ' selected' : '') + '>Flat ₹ off</option></select></div></div>' +
      '<div class="row c3"><div class="fg"><label>Value *</label><input name="value" type="number" min="1" value="' + c.value + '"></div><div class="fg"><label>Min order ₹</label><input name="min" type="number" min="0" value="' + c.min + '"></div><div class="fg"><label>Max discount ₹</label><input name="max" type="number" min="0" value="' + c.max + '" title="Percent coupons only. 0 = no cap"></div></div>' +
      '<div class="row c2"><div class="fg"><label>Expires on</label><input name="expires" type="date" value="' + esc(c.expires || '') + '"></div><div class="fg"><label>Total uses allowed (0 = unlimited)</label><input name="limit" type="number" min="0" value="' + c.limit + '"></div></div>' +
      '<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" name="firstOrder" style="width:auto" ' + (c.firstOrder ? 'checked' : '') + '> First order only</label>' +
      '<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" name="perCustomer" style="width:auto" ' + (c.perCustomer ? 'checked' : '') + '> Once per customer</label>' +
      '<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" name="show" style="width:auto" ' + (c.show ? 'checked' : '') + '> Show in cart and on the home page</label>' +
      '<label style="display:flex;gap:8px;align-items:center;margin:4px 0 12px"><input type="checkbox" name="active" style="width:auto" ' + (c.active ? 'checked' : '') + '> Live</label>' +
      '<div style="display:flex;gap:8px"><button class="btn acc" style="flex:1">Save coupon</button><button type="button" class="btn ghost" style="flex:1" data-act="close">Cancel</button></div>',
      function (f) {
        var code = f.code.value.trim().toUpperCase(), type = f.type.value, val = Math.round(+f.value.value);
        if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return 'Code must be 3 to 20 letters or numbers.';
        if (isNew && OG.coupons().some(function (x) { return x.code === code; })) return 'A coupon with this code already exists.';
        if (!(val > 0)) return 'Enter the discount value.';
        if (type === 'percent' && val > 90) return 'Percent discount can be at most 90.';
        var o = { code: code, type: type, value: val, min: Math.max(0, Math.round(+f.min.value) || 0), max: type === 'percent' ? Math.max(0, Math.round(+f.max.value) || 0) : 0, limit: Math.max(0, Math.round(+f.limit.value) || 0), used: c.used || 0, expires: f.expires.value, firstOrder: f.firstOrder.checked, perCustomer: f.perCustomer.checked, show: f.show.checked, active: f.active.checked };
        var all = OG.coupons().filter(function (x) { return x.code !== code; }); all.push(o); OG.saveCoupons(all);
        render(); toast('Coupon saved');
      });
  }

  /* ---------- Settings ---------- */
  function settings() {
    var s = OG.settings(), e = s.emailjs;
    return '<form id="sf" class="card" style="padding:18px;max-width:760px"><h3 style="margin-bottom:12px">Store details and website text</h3><div class="row c2"><div class="fg"><label>Phone</label><input name="phone" value="' + esc(s.phone) + '"></div><div class="fg"><label>Instagram</label><input name="insta" value="' + esc(s.insta) + '"></div></div>' +
      '<div class="row c2"><div class="fg"><label>Public email</label><input name="email" value="' + esc(s.email) + '"></div><div class="fg"><label>Admin alert email</label><input name="adminEmail" value="' + esc(s.adminEmail) + '"></div></div>' +
      '<div class="fg"><label>Top announcement bar</label><input name="announce" value="' + esc(s.announce) + '"></div><div class="fg"><label>Homepage headline</label><input name="heroTitle" value="' + esc(s.heroTitle) + '"></div><div class="fg"><label>Homepage sub-text</label><textarea name="heroSub" rows="2">' + esc(s.heroSub) + '</textarea></div><div class="fg"><label>About text (footer)</label><textarea name="about" rows="2">' + esc(s.about) + '</textarea></div>' +
      '<div class="row c2"><div class="fg"><label>Delivery fee ₹</label><input name="shipFee" type="number" min="0" value="' + s.shipFee + '"></div><div class="fg"><label>Free delivery from ₹</label><input name="freeAbove" type="number" min="0" value="' + s.freeAbove + '"></div></div>' +
      '<h3 style="margin:16px 0 4px">Email alerts (EmailJS)</h3><p class="small muted">Create a free account at emailjs.com, add your Gmail as a service and a template that uses {{to_email}}, {{subject}} and {{message}}, then paste the three IDs here.</p>' +
      '<div class="row c3"><div class="fg"><label>Service ID</label><input name="ejs" value="' + esc(e.service) + '"></div><div class="fg"><label>Template ID</label><input name="ejt" value="' + esc(e.template) + '"></div><div class="fg"><label>Public key</label><input name="ejk" value="' + esc(e.publicKey) + '"></div></div>' +
      '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="nv" style="width:auto" ' + (s.notifyVisits ? 'checked' : '') + '> Email me when a customer signs up, logs in or visits</label>' +
      '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn acc">Save settings</button><button type="button" class="btn ghost" data-act="testmail">Send test email</button></div></form>' +
      '<div class="card" style="padding:18px;max-width:760px;margin-top:16px"><h3 style="margin-bottom:10px">Admin password</h3><form id="pwf"><div class="row c2"><div class="fg"><label>Current password</label><input type="password" name="o" autocomplete="current-password"></div><div class="fg"><label>New password</label><input type="password" name="n" autocomplete="new-password"></div></div><div class="err" id="pwe"></div><button class="btn">Change password</button></form></div>' +
      '<div class="card" style="padding:18px;max-width:760px;margin-top:16px"><h3 style="margin-bottom:6px">Backup</h3><p class="small muted">Download all prices, images, orders, customers and reviews, or restore them on another device.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-act="export">Download backup</button><label class="btn ghost" style="margin:0;cursor:pointer">Restore backup<input type="file" id="imp" accept=".json" style="display:none"></label><button class="btn bad" data-act="reset">Reset all price/product edits</button></div></div>';
  }
  function bindSettings() {
    $('#sf').onsubmit = function (ev) {
      ev.preventDefault(); var f = ev.target, s = OG.settings();
      ['phone', 'insta', 'email', 'adminEmail', 'announce', 'heroTitle', 'heroSub', 'about'].forEach(function (k) { s[k] = f[k].value.trim(); });
      s.shipFee = Math.max(0, +f.shipFee.value || 0); s.freeAbove = Math.max(0, +f.freeAbove.value || 0);
      s.emailjs = { service: f.ejs.value.trim(), template: f.ejt.value.trim(), publicKey: f.ejk.value.trim() }; s.notifyVisits = f.nv.checked;
      OG.saveSettings(s); toast('Settings saved');
    };
    $('#pwf').onsubmit = function (ev) {
      ev.preventDefault(); var f = ev.target;
      OG.adminChangePassword(f.o.value, f.n.value).then(function (r) { if (r.error) $('#pwe').textContent = r.error; else { $('#pwe').textContent = ''; f.reset(); toast('Password changed'); } });
    };
    $('#imp').onchange = function () {
      var fl = this.files[0]; if (!fl) return; var fr = new FileReader();
      fr.onload = function () { try { OG.importAll(fr.result).then(function () { toast('Backup restored'); shell(); render(); }); } catch (er) { toast(er.message); } };
      fr.readAsText(fl);
    };
  }

  /* ---------- Events ---------- */
  function inA(t) { return !!(t && t.closest && t.closest('#adminroot,#amodal')); }
  document.addEventListener('click', function (e) {
    if (!inA(e.target)) return;
    var v2 = e.target.closest('[data-v2]'); if (v2) { e.preventDefault(); view = v2.dataset.v2; shell(); render(); return; }
    var t = e.target.closest('[data-act]'); if (!t) return; var a = t.dataset.act, id = t.dataset.id;
    if (a === 'out') { OG.adminLogout(); gate(); }
    else if (a === 'back') closeAdmin();
    else if (a === 'seen') { var all = OG.orders(); all.forEach(function (o) { o.seen = true; }); OG.saveOrders(all); shell(); render(); }
    else if (a === 'ofil') { ofil = t.dataset.s; render(); }
    else if (a === 'advance') { OG.setStatus(id, t.dataset.s, 'Updated by admin'); var o = OG.order(id); if (o) { var allO = OG.orders(); allO.forEach(function (x) { if (x.id === id) x.seen = true; }); OG.saveOrders(allO); } shell(); render(); toast('Marked ' + t.dataset.s); }
    else if (a === 'acancel') {
      dlg('<h2 style="font-size:20px;margin-bottom:6px">Cancel order ' + esc(id) + '?</h2><div class="fg" style="margin-top:10px"><label>Reason (the customer will see it)</label><input name="reason" value="Out of stock"></div><div style="display:flex;gap:8px"><button class="btn bad" style="flex:1">Cancel order</button><button type="button" class="btn ghost" style="flex:1" data-act="close">Keep order</button></div>', function (f) {
        var reason = f.reason.value.trim() || 'Cancelled by OhmGo', r = OG.cancelOrder(id, reason, 'admin');
        if (r.error) OG.setStatus(id, 'Cancelled', 'Cancelled by OhmGo: ' + reason, { cancelReason: reason, cancelledBy: 'admin' });
        shell(); render(); toast('Order cancelled');
      });
    }
    else if (a === 'addp') openPform(null);
    else if (a === 'editp') openPform(OG.product(id));
    else if (a === 'delp') { var p = OG.product(id); askConfirm('Delete this product?', p.name, 'Delete', function () { OG.deleteProduct(id); render(); toast('Deleted'); }); }
    else if (a === 'rmimg') { OG.deleteImage(id).then(function () { var p2 = OG.product(id); $('#pimg').src = OG.img(p2); pendingImg = null; toast('Photo removed'); }); }
    else if (a === 'pg') { pst.page += +t.dataset.d; render(); }
    else if (a === 'close') $('#amodal').innerHTML = '';
    else if (a === 'bulk') {
      dlg('<h2 style="font-size:20px;margin-bottom:6px">Change prices in bulk</h2><p class="muted small">Use a minus number for a discount (for example -10 cuts prices by 10%).</p><div class="fg" style="margin-top:10px"><label>Category</label><select name="cat"><option value="all">All products</option>' + OG.cats.map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></div><div class="fg"><label>Percent change</label><input name="pct" type="number" step="1" value="-10"></div><div style="display:flex;gap:8px"><button class="btn acc" style="flex:1">Apply</button><button type="button" class="btn ghost" style="flex:1" data-act="close">Cancel</button></div>', function (f) {
        var pc = +f.pct.value; if (isNaN(pc) || pc < -90 || pc > 300 || pc === 0) return 'Enter a number between -90 and 300 (not 0).';
        var n = OG.bulkPrice(f.cat.value, pc); toast(n + ' prices updated'); render();
      });
    }
    else if (a === 'newcpn') couponForm(null);
    else if (a === 'editcpn') couponForm(OG.coupons().filter(function (c) { return c.code === id; })[0]);
    else if (a === 'delcpn') askConfirm('Delete coupon ' + id + '?', 'Customers will no longer be able to use it. Past orders keep their discount.', 'Delete', function () { OG.saveCoupons(OG.coupons().filter(function (c) { return c.code !== id; })); render(); toast('Coupon deleted'); });
    else if (a === 'delrev') { OG.deleteReview(id); render(); }
    else if (a === 'testmail') { OG.notify('OhmGo test email', 'If you can read this, email alerts are working.'); toast('Test email sent. Check the email log on the dashboard.'); }
    else if (a === 'export') { var b = new Blob([OG.exportAll()], { type: 'application/json' }), l = document.createElement('a'); l.href = URL.createObjectURL(b); l.download = 'ohmgo-backup-' + new Date().toISOString().slice(0, 10) + '.json'; l.click(); }
    else if (a === 'reset') {
      askConfirm('Reset all edits?', 'This removes every price, stock and photo edit and all custom products you added. Orders and customers stay.', 'Reset', function () {
        OG.ls.del('ov'); OG.ls.del('custom'); OG.invalidate(); Object.keys(OG.imgs).forEach(function (k) { OG.deleteImage(k).catch(function () {}); }); toast('Reset done'); render();
      });
    }
  });
  document.addEventListener('change', function (e) {
    if (!inA(e.target)) return;
    var t = e.target;
    if (t.id === 'pc') { pst.cat = t.value; pst.page = 1; render(); }
    else if (t.id === 'ph') { pst.hidden = t.checked ? '1' : ''; pst.page = 1; render(); }
    else if (t.dataset.pf) {
      var id = t.dataset.id, k = t.dataset.pf, p = OG.product(id);
      if (k === 'show') { OG.patchProduct(id, { hidden: !t.checked }); toast(t.checked ? 'Visible in store' : 'Hidden from store'); return; }
      var v = Math.round(+t.value);
      if (isNaN(v) || v < (k === 'stock' ? 0 : 1)) { t.value = p[k]; toast('Enter a valid number'); return; }
      var patch = {}; patch[k] = v; if (k === 'price' && p.mrp < v) { patch.mrp = v; }
      OG.patchProduct(id, patch); toast('Saved'); if (k === 'price') { var m = $('[data-pf="mrp"][data-id="' + id + '"]'); if (m) m.value = OG.product(id).mrp; }
    }
    else if (t.dataset.cf) { var cps = OG.coupons(); cps.forEach(function (c) { if (c.code === t.dataset.id) c.active = t.checked; }); OG.saveCoupons(cps); toast(t.checked ? 'Coupon is live' : 'Coupon paused'); }
    else if (t.dataset.f) { var ex = {}; ex[t.dataset.f] = t.value.trim(); var all = OG.orders(); all.forEach(function (o) { if (o.id === t.dataset.id) Object.assign(o, ex); }); OG.saveOrders(all); toast('Saved'); }
    else if (t.dataset.rf) { var rp = {}; rp[t.dataset.rf] = t.value.trim(); OG.setRequest(t.dataset.id, rp); toast('Saved'); if (t.dataset.rf === 'status') { shell(); render(); } }
  });
  var tm;
  document.addEventListener('input', function (e) {
    if (!inA(e.target)) return;
    if (e.target.id === 'ps') { clearTimeout(tm); var v = e.target.value; tm = setTimeout(function () { pst.q = v; pst.page = 1; render(); var i = $('#ps'); if (i) { i.focus(); i.setSelectionRange(v.length, v.length); } }, 300); }
  });

  /* ---------- Open / close inside the storefront page ---------- */
  var poll = null, started = false;
  function start() {
    OG.ready.then(function () {
      lastCount = OG.orders().length; shell(); render();
      if (poll) clearInterval(poll);
      poll = setInterval(function () {
        if (!OG.isAdmin() || root.hidden) return;
        var n = OG.orders().length;
        if (n !== lastCount) { if (n > lastCount) { beep(); toast('New order received!'); } lastCount = n; shell(); if (view === 'orders' || view === 'dash') render(); }
      }, 4000);
    });
  }
  function openAdmin() {
    document.body.classList.add('admin-mode'); root.hidden = false; window.scrollTo(0, 0);
    if (OG.isAdmin()) start(); else gate();
  }
  function closeAdmin() {
    if (poll) { clearInterval(poll); poll = null; }
    root.hidden = true; root.innerHTML = ''; $('#amodal').innerHTML = ''; document.body.classList.remove('admin-mode');
    try { if (location.hash === '#admin') history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (window.OG_refresh) window.OG_refresh();
  }
  window.OGAdmin = { open: openAdmin, close: closeAdmin };
  root.hidden = true;
})();
