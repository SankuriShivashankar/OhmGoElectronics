/* OhmGo shared data layer (storefront + admin).
   Storage = this browser's localStorage + IndexedDB (for uploaded images).
   NOTE: for orders/prices to be shared between the owner's device and customers' devices,
   this layer must be swapped for a real backend (e.g. Firebase / Supabase). All reads/writes
   go through the OG object below so that swap is limited to this one file. */
(function (w) {
  var K = 'ohmgo_';
  var ls = {
    get: function (k, d) { try { var v = localStorage.getItem(K + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(K + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(K + k); } catch (e) {} }
  };

  var DEFAULTS = {
    shopName: 'OhmGo',
    tagline: 'Electronics for you',
    phone: '9347532390',
    insta: 'ohmgo.in',
    email: 'ohmgoelectronics@gmail.com',
    adminEmail: 'ohmgoelectronics@gmail.com',
    announce: 'Free delivery on orders of \u20B9499 and above. Student prices, lower than local markets in Hyderabad.',
    heroTitle: 'Power your projects',
    heroSub: 'Arduino, ESP32, sensors, kits and custom projects for B.Tech, Diploma and school students, at student-friendly prices.',
    about: 'OhmGo is a Hyderabad based electronics store for students. We supply genuine components, build custom and AI projects, and help you finish your project on time.',
    shipFee: 49, freeAbove: 499,
    emailjs: { service: '', template: '', publicKey: '' },
    notifyVisits: true
  };

  var OG = { ls: ls, imgs: {}, _pc: null };

  OG.settings = function () {
    var st = ls.get('settings', {});
    if (!ls.get('mig499', false)) {            // one-time: older saved copies used a 999 free-delivery limit
      if (st.freeAbove === 999) { st.freeAbove = 499; ls.set('settings', st); }
      ls.set('mig499', true);
    }
    return Object.assign({}, DEFAULTS, st);
  };
  OG.saveSettings = function (s) { ls.set('settings', s); };

  /* ---------- IndexedDB images ---------- */
  var dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      try {
        var r = indexedDB.open('ohmgo', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('img'); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  function tx(mode, fn) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction('img', mode), s = t.objectStore('img'), out = fn(s);
        t.oncomplete = function () { res(out && out.result); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  OG.ready = (function () {
    return idb().then(function (db) {
      return new Promise(function (res) {
        var out = {}, t = db.transaction('img', 'readonly'), s = t.objectStore('img');
        var c = s.openCursor();
        c.onsuccess = function () { var cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } };
        t.oncomplete = function () { OG.imgs = out; res(); };
        t.onerror = function () { res(); };
      });
    }).catch(function () {});
  })();
  OG.saveImage = function (id, dataUrl) { OG.imgs[id] = dataUrl; return tx('readwrite', function (s) { return s.put(dataUrl, id); }); };
  OG.deleteImage = function (id) { delete OG.imgs[id]; return tx('readwrite', function (s) { return s.delete(id); }); };
  OG.fileToDataUrl = function (file, max) {
    max = max || 700;
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('Please choose an image file (JPG, PNG, WEBP).'));
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('Could not read the file.')); };
      fr.onload = function () {
        var im = new Image();
        im.onerror = function () { rej(new Error('This image could not be opened.')); };
        im.onload = function () {
          var sc = Math.min(1, max / Math.max(im.width, im.height));
          var cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(im.width * sc)); cv.height = Math.max(1, Math.round(im.height * sc));
          var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
          cx.drawImage(im, 0, 0, cv.width, cv.height);
          res(cv.toDataURL('image/jpeg', 0.85));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };

  /* ---------- Products ---------- */
  OG.cats = w.OG_CATS;
  OG.cat = function (id) { for (var i = 0; i < OG.cats.length; i++) if (OG.cats[i].id === id) return OG.cats[i]; return OG.cats[0]; };
  OG.invalidate = function () { OG._pc = null; };
  OG.products = function (includeHidden) {
    if (!OG._pc) {
      var ov = ls.get('ov', {}), custom = ls.get('custom', []), out = [];
      w.OG_CATALOG.concat(custom).forEach(function (p) {
        var o = ov[p.id];
        if (o && o.deleted) return;
        out.push(o ? Object.assign({}, p, o) : p);
      });
      OG._pc = out;
    }
    return includeHidden ? OG._pc : OG._pc.filter(function (p) { return !p.hidden; });
  };
  OG.product = function (id) { var a = OG.products(true); for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; };
  OG.patchProduct = function (id, patch) { var ov = ls.get('ov', {}); ov[id] = Object.assign({}, ov[id] || {}, patch); ls.set('ov', ov); OG.invalidate(); };
  OG.deleteProduct = function (id) { OG.patchProduct(id, { deleted: true }); OG.deleteImage(id).catch(function () {}); };
  OG.addProduct = function (p) {
    var custom = ls.get('custom', []);
    p.id = 'OGX' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);
    p.custom = true; p.created = Date.now();
    custom.push(p); ls.set('custom', custom); OG.invalidate(); return p.id;
  };
  OG.bulkPrice = function (catId, pct) {
    var ov = ls.get('ov', {}), n = 0;
    OG.products(true).forEach(function (p) {
      if (catId && catId !== 'all' && p.cat !== catId) return;
      var np = Math.max(1, Math.round(p.price * (1 + pct / 100)));
      ov[p.id] = Object.assign({}, ov[p.id] || {}, { price: np }); n++;
    });
    ls.set('ov', ov); OG.invalidate(); return n;
  };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  OG.esc = esc;
  var phc = {};
  OG.img = function (p) {
    if (OG.imgs[p.id]) return OG.imgs[p.id];
    if (p.img) return p.img;
    var key = p.cat + '|' + p.name;
    if (phc[key]) return phc[key];
    var c = OG.cat(p.cat), words = p.name.replace(/\(.*?\)/g, '').split(' ');
    var l1 = '', l2 = '', l3 = '';
    words.forEach(function (w2) {
      if ((l1 + ' ' + w2).trim().length <= 18 && !l2) l1 = (l1 + ' ' + w2).trim();
      else if ((l2 + ' ' + w2).trim().length <= 18 && !l3) l2 = (l2 + ' ' + w2).trim();
      else if (l3.length < 15) l3 = (l3 + ' ' + w2).trim();
    });
    if (l3.length > 15) l3 = l3.slice(0, 14) + '…';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c.color + '" stop-opacity=".95"/><stop offset="1" stop-color="' + c.color + '" stop-opacity=".65"/></linearGradient></defs><rect width="300" height="300" fill="#faf3df"/><rect x="40" y="36" width="220" height="140" rx="14" fill="url(#g)"/><g fill="#faf3df" opacity=".9"><rect x="100" y="76" width="100" height="60" rx="6"/></g><g stroke="#faf3df" stroke-width="5" stroke-linecap="round" opacity=".85"><path d="M60 70h28M60 100h28M60 130h28M212 70h28M212 100h28M212 130h28"/></g><circle cx="150" cy="106" r="12" fill="' + c.color + '"/>' +
      '<g font-family="Georgia,serif" font-weight="700" text-anchor="middle" fill="#1c1a17" font-size="19"><text x="150" y="212">' + esc(l1) + '</text><text x="150" y="238">' + esc(l2) + '</text><text x="150" y="264" font-size="16" opacity=".75">' + esc(l3) + '</text></g></svg>';
    return (phc[key] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  };
  OG.pct = function (p) { return p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0; };
  OG.money = function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };

  /* ---------- Users / session ---------- */
  OG.users = function () { return ls.get('users', {}); };
  OG.session = function () { var e = ls.get('session', null); return e ? (OG.users()[e] || null) : null; };
  function normPhone(p) { p = String(p || '').replace(/\D/g, ''); if (p.length > 10) p = p.slice(-10); return p; }
  OG.normPhone = normPhone;
  OG.validEmail = function (e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); };
  OG.signUp = function (name, email, phone) {
    email = String(email).trim().toLowerCase(); phone = normPhone(phone); name = String(name).trim();
    if (!name) return { error: 'Please enter your name.' };
    if (!OG.validEmail(email)) return { error: 'Please enter a valid email address.' };
    if (!/^[6-9]\d{9}$/.test(phone)) return { error: 'Please enter a valid 10-digit Indian mobile number.' };
    var u = OG.users();
    if (u[email]) return { error: 'This email is already registered. Please log in instead.' };
    u[email] = { email: email, phone: phone, name: name, created: Date.now(), addresses: [] };
    ls.set('users', u); ls.set('session', email); return { user: u[email], isNew: true };
  };
  OG.logIn = function (email, phone) {
    email = String(email).trim().toLowerCase(); phone = normPhone(phone);
    var u = OG.users()[email];
    if (!u) return { error: 'No account found for this email. Please sign up first.' };
    if (u.phone !== phone) return { error: 'Phone number does not match this email.' };
    ls.set('session', email); return { user: u };
  };
  OG.logOut = function () { ls.del('session'); };
  OG.saveUser = function (u) { var all = OG.users(); all[u.email] = u; ls.set('users', all); };

  /* ---------- Cart ---------- */
  OG.cart = function () { return ls.get('cart', []); };
  OG.saveCart = function (c) { ls.set('cart', c); };
  OG.cartAdd = function (id, qty) {
    var c = OG.cart(), p = OG.product(id); if (!p) return;
    var f = c.filter(function (x) { return x.id === id; })[0];
    if (f) f.qty = Math.min(p.stock, f.qty + (qty || 1)); else c.push({ id: id, qty: Math.min(p.stock, qty || 1) });
    OG.saveCart(c);
  };
  OG.cartSet = function (id, qty) {
    var c = OG.cart().map(function (x) { return x.id === id ? { id: id, qty: qty } : x; }).filter(function (x) { return x.qty > 0; });
    OG.saveCart(c);
  };
  OG.cartCount = function () { return OG.cart().reduce(function (a, x) { return a + x.qty; }, 0); };
  OG.cartTotals = function (items, cr) {
    var s = OG.settings(), sub = 0;
    items.forEach(function (i) { sub += i.price * i.qty; });
    var disc = cr && cr.amount ? Math.min(cr.amount, sub) : 0, net = sub - disc;
    var ship = sub === 0 ? 0 : (net >= s.freeAbove ? 0 : s.shipFee);   // free delivery from the free-delivery amount, measured after discount
    return { sub: sub, discount: disc, ship: ship, total: net + ship };
  };

  /* ---------- Discount coupons ---------- */
  var SEED = [
    { code: 'WELCOME10', type: 'percent', value: 10, min: 299, max: 100, limit: 0, used: 0, expires: '', firstOrder: true, perCustomer: true, show: true, active: true },
    { code: 'STUDENT50', type: 'flat', value: 50, min: 999, max: 0, limit: 0, used: 0, expires: '', firstOrder: false, perCustomer: false, show: true, active: true }
  ];
  OG.coupons = function () { var c = ls.get('coupons', null); if (c === null) { c = SEED; ls.set('coupons', c); } return c; };
  OG.saveCoupons = function (c) { ls.set('coupons', c); };
  OG.couponText = function (c) {
    return (c.type === 'percent' ? c.value + '% off' + (c.max > 0 ? ' (up to \u20B9' + c.max + ')' : '') : '\u20B9' + c.value + ' off') + (c.min > 0 ? ' on orders of \u20B9' + c.min + '+' : '') + (c.firstOrder ? ', first order only' : '');
  };
  OG.couponApply = function (code, items, email) {
    code = String(code || '').trim().toUpperCase();
    var c = OG.coupons().filter(function (x) { return x.code === code; })[0];
    if (!code) return { error: 'Enter a coupon code.' };
    if (!c || !c.active) return { error: 'This coupon code is not valid.' };
    if (c.expires && Date.now() > new Date(c.expires + 'T23:59:59').getTime()) return { error: 'This coupon has expired.' };
    if (c.limit > 0 && c.used >= c.limit) return { error: 'This coupon has reached its usage limit.' };
    var sub = items.reduce(function (a, i) { return a + i.price * i.qty; }, 0);
    if (sub < c.min) return { error: 'Add items worth ' + OG.money(c.min - sub) + ' more to use ' + c.code + ' (minimum order ' + OG.money(c.min) + ').' };
    var prior = OG.orders().filter(function (o) { return o.email === email && o.status !== 'Cancelled'; });
    if (c.firstOrder && prior.length) return { error: c.code + ' is only for your first order.' };
    if (c.perCustomer && prior.some(function (o) { return o.coupon && o.coupon.code === c.code; })) return { error: 'You have already used ' + c.code + '.' };
    var amt = c.type === 'percent' ? Math.floor(sub * c.value / 100) : c.value;
    if (c.type === 'percent' && c.max > 0) amt = Math.min(amt, c.max);
    amt = Math.min(amt, sub);
    if (amt <= 0) return { error: 'This coupon gives no discount on your cart.' };
    return { code: c.code, amount: amt, note: OG.couponText(c) };
  };
  OG.cartItems = function () {
    return OG.cart().map(function (x) { var p = OG.product(x.id); return p ? { id: p.id, name: p.name, price: p.price, mrp: p.mrp, qty: x.qty, stock: p.stock, cat: p.cat } : null; }).filter(Boolean);
  };

  /* ---------- Orders ---------- */
  OG.FLOW = ['Accepted', 'Packed', 'Dispatched', 'Out for Delivery', 'Delivered'];
  OG.CANCELLABLE = ['Placed', 'Accepted', 'Packed'];
  OG.orders = function () { return ls.get('orders', []); };
  OG.saveOrders = function (o) { ls.set('orders', o); };
  OG.order = function (id) { return OG.orders().filter(function (o) { return o.id === id; })[0] || null; };
  OG.myOrders = function (email) { return OG.orders().filter(function (o) { return o.email === email; }).sort(function (a, b) { return b.created - a.created; }); };
  OG.placeOrder = function (o) {
    var all = OG.orders(), now = Date.now(), d = new Date(now);
    o.id = 'OGO' + d.getFullYear().toString().slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + String(Math.floor(Math.random() * 90000 + 10000));
    o.created = now;
    o.status = 'Accepted';           // auto-accepted as soon as it is received
    o.history = [{ s: 'Placed', t: now }, { s: 'Accepted', t: now + 1, note: 'Order accepted automatically' }];
    o.items.forEach(function (i) { var p = OG.product(i.id); if (p) OG.patchProduct(i.id, { stock: Math.max(0, p.stock - i.qty) }); });
    all.push(o); OG.saveOrders(all); OG.saveCart([]); OG.ls.del('coupon');
    if (o.coupon) { var cp = OG.coupons(); cp.forEach(function (x) { if (x.code === o.coupon.code) x.used = (x.used || 0) + 1; }); OG.saveCoupons(cp); }
    return o;
  };
  OG.setStatus = function (id, status, note, extra) {
    var all = OG.orders(), o = all.filter(function (x) { return x.id === id; })[0]; if (!o) return null;
    var was = o.status;
    o.status = status; o.history.push({ s: status, t: Date.now(), note: note || '' });
    if (extra) Object.assign(o, extra);
    if (status === 'Cancelled' && was !== 'Cancelled') {
      o.items.forEach(function (i) { var p = OG.product(i.id); if (p) OG.patchProduct(i.id, { stock: p.stock + i.qty }); });
      if (o.coupon) { var cp = OG.coupons(); cp.forEach(function (x) { if (x.code === o.coupon.code && x.used > 0) x.used--; }); OG.saveCoupons(cp); }
    }
    OG.saveOrders(all); return o;
  };
  OG.cancelOrder = function (id, reason, by) {
    var o = OG.order(id); if (!o) return { error: 'Order not found.' };
    if (OG.CANCELLABLE.indexOf(o.status) < 0) return { error: 'This order can no longer be cancelled because it is ' + o.status.toLowerCase() + '.' };
    return { order: OG.setStatus(id, 'Cancelled', (by === 'admin' ? 'Cancelled by OhmGo' : 'Cancelled by customer') + (reason ? ': ' + reason : ''), { cancelReason: reason || '', cancelledBy: by || 'customer' }) };
  };

  /* ---------- Reviews ---------- */
  OG.reviews = function (pid) { var r = ls.get('reviews', []); return pid ? r.filter(function (x) { return x.pid === pid; }) : r; };
  OG.addReview = function (rv) {
    var all = ls.get('reviews', []);
    rv.id = 'R' + Date.now().toString(36); rv.ts = Date.now();
    rv.verified = OG.orders().some(function (o) { return o.email === rv.email && o.status === 'Delivered' && o.items.some(function (i) { return i.id === rv.pid; }); });
    all = all.filter(function (x) { return !(x.pid === rv.pid && x.email === rv.email); });
    all.push(rv); ls.set('reviews', all); return rv;
  };
  OG.deleteReview = function (id) { ls.set('reviews', ls.get('reviews', []).filter(function (r) { return r.id !== id; })); };
  OG.rating = function (pid) { var r = OG.reviews(pid); if (!r.length) return { avg: 0, n: 0 }; return { avg: r.reduce(function (a, x) { return a + x.rating; }, 0) / r.length, n: r.length }; };

  /* ---------- Custom project requests ---------- */
  OG.requests = function () { return ls.get('requests', []); };
  OG.addRequest = function (r) { var a = OG.requests(); r.id = 'REQ' + Date.now().toString(36).toUpperCase(); r.ts = Date.now(); r.status = 'New'; a.push(r); ls.set('requests', a); return r; };
  OG.setRequest = function (id, patch) { var a = OG.requests(); a.forEach(function (r) { if (r.id === id) Object.assign(r, patch); }); ls.set('requests', a); };

  /* ---------- Visits log + email notifications ---------- */
  OG.visits = function () { return ls.get('visits', []); };
  OG.logVisit = function (u, kind) {
    var v = OG.visits(); v.push({ t: Date.now(), email: u.email, name: u.name, phone: u.phone, kind: kind }); ls.set('visits', v.slice(-500));
  };
  OG.outbox = function () { return ls.get('outbox', []); };
  OG.notify = function (subject, body) {
    var s = OG.settings(), ob = OG.outbox();
    var item = { t: Date.now(), subject: subject, body: body, sent: false };
    var e = s.emailjs || {};
    if (e.service && e.template && e.publicKey) {
      fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: e.service, template_id: e.template, user_id: e.publicKey, template_params: { to_email: s.adminEmail, subject: subject, message: body } })
      }).then(function (r) { item.sent = r.ok; if (!r.ok) item.err = 'HTTP ' + r.status; save(); }).catch(function (er) { item.err = String(er); save(); });
    } else item.err = 'Email not configured';
    function save() { var o = OG.outbox(); o.push(item); ls.set('outbox', o.slice(-100)); }
    if (item.err === 'Email not configured') save();
  };
  OG.orderText = function (o) {
    var a = o.address || {};
    return 'Order ' + o.id + ' | ' + new Date(o.created).toLocaleString('en-IN') + '\nCustomer: ' + o.name + ' | ' + o.phone + ' | ' + o.email +
      '\nShip to: ' + a.name + ', ' + a.line + ', ' + (a.area ? a.area + ', ' : '') + a.city + ', ' + a.state + ' - ' + a.pin + (a.landmark ? ' (Landmark: ' + a.landmark + ')' : '') + ' [' + a.type + ']' +
      '\nPayment: ' + o.payment + '\nItems:\n' + o.items.map(function (i) { return ' - ' + i.name + ' x' + i.qty + ' = ' + OG.money(i.price * i.qty); }).join('\n') +
      '\nSubtotal ' + OG.money(o.totals.sub) + (o.totals.discount ? ' | Discount -' + OG.money(o.totals.discount) + (o.coupon ? ' (' + o.coupon.code + ')' : '') : '') + ' | Delivery ' + OG.money(o.totals.ship) + ' | TOTAL ' + OG.money(o.totals.total) + (o.note ? '\nNote: ' + o.note : '');
  };

  /* ---------- Admin auth (client side only) ---------- */
  function sha(s) {
    if (!(w.crypto && crypto.subtle)) return Promise.resolve('p:' + btoa(unescape(encodeURIComponent(s))));
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode('ohmgo|' + s)).then(function (b) {
      return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
    });
  }
  OG.adminSetupDone = function () { return !!ls.get('adminHash', null); };
  OG.adminSetup = function (email, pw) {
    if (String(email).trim().toLowerCase() !== OG.settings().adminEmail.toLowerCase()) return Promise.resolve({ error: 'Use the owner email: ' + OG.settings().adminEmail });
    if (String(pw).length < 8) return Promise.resolve({ error: 'Password must be at least 8 characters.' });
    return sha(pw).then(function (h) { ls.set('adminHash', h); ls.set('adminSession', { t: Date.now() }); return { ok: true }; });
  };
  OG.adminLogin = function (email, pw) {
    if (String(email).trim().toLowerCase() !== OG.settings().adminEmail.toLowerCase()) return Promise.resolve({ error: 'Wrong email or password.' });
    return sha(pw).then(function (h) {
      if (h !== ls.get('adminHash', null)) return { error: 'Wrong email or password.' };
      ls.set('adminSession', { t: Date.now() }); return { ok: true };
    });
  };
  OG.adminChangePassword = function (oldPw, newPw) {
    if (String(newPw).length < 8) return Promise.resolve({ error: 'New password must be at least 8 characters.' });
    return sha(oldPw).then(function (h) {
      if (h !== ls.get('adminHash', null)) return { error: 'Current password is wrong.' };
      return sha(newPw).then(function (n) { ls.set('adminHash', n); return { ok: true }; });
    });
  };
  OG.isAdmin = function () { var s = ls.get('adminSession', null); return !!(s && Date.now() - s.t < 12 * 3600 * 1000); };
  OG.adminLogout = function () { ls.del('adminSession'); };

  /* ---------- Backup ---------- */
  OG.exportAll = function () {
    var o = {}; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(K) === 0 && k !== K + 'adminHash' && k !== K + 'adminSession' && k !== K + 'session') o[k] = localStorage.getItem(k); }
    return JSON.stringify({ app: 'ohmgo', v: 1, exported: Date.now(), data: o, images: OG.imgs });
  };
  OG.importAll = function (text) {
    var j = JSON.parse(text); if (!j || j.app !== 'ohmgo') throw new Error('This is not an OhmGo backup file.');
    Object.keys(j.data).forEach(function (k) { localStorage.setItem(k, j.data[k]); });
    var ps = Object.keys(j.images || {}).map(function (id) { return OG.saveImage(id, j.images[id]); });
    OG.invalidate(); return Promise.all(ps);
  };

  w.OG = OG;
})(window);
