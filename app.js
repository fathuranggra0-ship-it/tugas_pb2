/* ===== Kasirin – data tersimpan di localStorage (mode demo tanpa server) ===== */
const $ = s => document.querySelector(s);
const rp = n => 'Rp' + Math.abs(n).toLocaleString('id-ID');
const rs = n => (n > 0 ? '+' : n < 0 ? '−' : '') + rp(n);
const fmt = t => new Date(t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => { s = s.trim().replace(/[\s-]/g, ''); return s.startsWith('+62') ? '0' + s.slice(3) : s; };
const age = d => { const b = new Date(d), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
const sum = a => a.reduce((s, x) => s + x.amount, 0);
const KEY = 'kasirin2';

const CAT = {
  'Toko Kelontong': [['🍚', 'Beras 5kg', 68000], ['🛢️', 'Minyak 2L', 38000], ['🍬', 'Gula 1kg', 17000], ['🥚', 'Telur 1kg', 28000], ['☕', 'Kopi sachet', 2500], ['🧼', 'Sabun', 5000]],
  'Restoran': [['🍛', 'Nasi Goreng', 25000], ['🍜', 'Mie Ayam', 20000], ['🍗', 'Ayam Bakar', 32000], ['🥗', 'Gado-gado', 18000], ['🧋', 'Es Teh', 7000], ['🍹', 'Jus Jeruk', 14000]],
  'Kafe': [['☕', 'Kopi Susu', 18000], ['🥐', 'Croissant', 20000], ['🍰', 'Cheesecake', 28000], ['🧋', 'Matcha', 24000]]
};
CAT['Warung Makan'] = CAT['Restoran'];
const TYPES = [...Object.keys(CAT), 'Lainnya'];

let db = JSON.parse(localStorage.getItem(KEY) || 'null') || {
  users: [{ id: 1, name: 'Sari Wulandari', pob: 'Medan', dob: '1990-05-12', phone: '0811111111', addr: 'Jl. Merdeka No. 10, Medan', balance: 250000, biz: { type: 'Toko Kelontong', name: 'Toko Berkah Sari' } }],
  tx: []
};
const save = () => localStorage.setItem(KEY, JSON.stringify(db));
let me = null, tab = 'home', note = '', pending = '', otp = '', tt = 'bank', bcart = {}, man = 0, inv = null;

function toast(m, t = 'ok') {
  const e = $('#tst'); e.textContent = m; e.className = 'show ' + t;
  clearTimeout(toast.h); toast.h = setTimeout(() => e.className = '', 3200);
}

/* ===== Masuk / Buat akun ===== */
const bizOpts = '<option value="">Belum punya bisnis</option>' + TYPES.map(t => `<option>${t}</option>`).join('');
$('#rgBiz').innerHTML = bizOpts;
$('#rgBiz').onchange = e => $('#rgBizWrap').hidden = !e.target.value;
$('#rgTgl').max = new Date().toISOString().slice(0, 10);
$('#rgTgl').oninput = e => $('#rgUmur').value = e.target.value ? age(e.target.value) + ' tahun' : '';

const showAuth = m => {
  $('#f1').hidden = m !== 'in'; $('#fr').hidden = m !== 'up'; $('#f2').hidden = true;
  $('#tl').classList.toggle('on', m === 'in'); $('#tr').classList.toggle('on', m === 'up');
};
$('#tl').onclick = () => showAuth('in');
$('#tr').onclick = () => showAuth('up');

$('#fr').onsubmit = e => {
  e.preventDefault();
  const hp = norm($('#rgHp').value), dob = $('#rgTgl').value, type = $('#rgBiz').value;
  if (!/^0\d{8,13}$/.test(hp)) return toast('No. telepon tidak valid. Contoh: 0812xxxxxxxx', 'err');
  if (db.users.some(u => u.phone === hp)) return toast('No. telepon sudah terdaftar. Silakan masuk.', 'err');
  if (age(dob) < 17) return toast('Usia minimal 17 tahun untuk membuat akun', 'err');
  db.users.push({ id: Date.now(), name: $('#rgNama').value.trim(), pob: $('#rgTmp').value.trim(), dob, phone: hp, addr: $('#rgAlamat').value.trim(), balance: 0,
    biz: type ? { type, name: $('#rgBizNama').value.trim() || type } : null });
  save(); e.target.reset(); $('#rgBizWrap').hidden = true;
  showAuth('in'); $('#contact').value = hp; toast('Akun dibuat. Masuk dengan kode OTP.');
};

$('#f1').onsubmit = e => {
  e.preventDefault();
  const hp = norm($('#contact').value);
  if (!db.users.some(u => u.phone === hp)) return toast('Nomor belum terdaftar. Buat akun dulu di tab "Buat akun".', 'err');
  pending = hp; otp = String(100000 + Math.floor(Math.random() * 900000));
  // Mode demo: kode tampil di layar. Di produksi, kirim lewat SMS dari server.
  $('#otpbox').innerHTML = `📩 Kode dikirim ke <b>${esc(hp)}</b><br>Kode OTP (demo): <b>${otp}</b>`;
  $('#f1').hidden = true; $('#f2').hidden = false; $('#otp').value = ''; $('#otp').focus();
};
$('#f2').onsubmit = e => {
  e.preventDefault();
  if ($('#otp').value.trim() !== otp) return toast('Kode OTP salah. Periksa lagi kodenya.', 'err');
  me = db.users.find(u => u.phone === pending); otp = '';
  localStorage.setItem(KEY + '_me', me.id); enter();
};
$('#back').onclick = () => showAuth('in');
document.querySelectorAll('.demo button').forEach(b => b.onclick = () => $('#contact').value = b.dataset.c);

function enter() { $('#login').hidden = true; $('#app').hidden = false; tab = 'home'; render(); }
function logout() { localStorage.removeItem(KEY + '_me'); location.reload(); }
function go(k) { tab = k; note = ''; inv = null; render(); }

/* ===== Transaksi ===== */
const mine = () => db.tx.filter(x => x.user == me.id);
function rec(kind, title, detail, amount) {
  me.balance += amount;
  db.tx.unshift({ id: db.tx.length ? Math.max(...db.tx.map(x => x.id)) + 1 : 1, t: Date.now(), user: me.id, kind, title, detail, amount });
  save();
}
const noteBox = (t, p) => note = `<div class="card notice"><b>${t}</b><p>${p}</p></div>`;
const code = () => String(Math.floor(100000 + Math.random() * 900000));

function txTable(l) {
  if (!l.length) return '<p class="muted">Belum ada transaksi. Riwayat akan muncul di sini.</p>';
  const L = { topup: 'Top Up', qris: 'Bayar QRIS', transfer: 'Transfer', penjualan: 'Penjualan' };
  return `<div class="wrap"><table><tr><th>Waktu</th><th>Jenis</th><th>Keterangan</th><th class="r">Jumlah</th></tr>${l.map(x =>
    `<tr><td>${fmt(x.t)}</td><td><span class="tag ${x.kind}">${L[x.kind]}</span></td><td>${esc(x.title)}<br><small>${esc(x.detail)}</small></td><td class="r ${x.amount > 0 ? 'pos' : 'neg'}">${rs(x.amount)}</td></tr>`).join('')}</table></div>`;
}
function exportXls(kind) { // kind: 'all' atau 'penjualan'
  const rows = kind === 'penjualan' ? mine().filter(x => x.kind === 'penjualan') : mine();
  if (!rows.length) return toast('Belum ada transaksi untuk diekspor', 'err');
  const h = ['ID', 'Waktu', 'Jenis', 'Keterangan', 'Rincian', 'Jumlah (Rp)'];
  const b = rows.map(x => '<tr>' + [x.id, fmt(x.t), x.kind, x.title, x.detail, x.amount].map(v => `<td>${esc(v)}</td>`).join('') + '</tr>').join('');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([`<html><head><meta charset="UTF-8"></head><body><table border="1"><tr>${h.map(v => `<th>${v}</th>`).join('')}</tr>${b}</table></body></html>`], { type: 'application/vnd.ms-excel' }));
  a.download = kind === 'penjualan' ? 'riwayat-penjualan.xls' : 'riwayat-transaksi.xls'; a.click();
}

/* QR demo (pola acak berdasarkan teks, BUKAN kode QRIS asli) */
function qr(seed, n = 25) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 4294967296;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const f = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    if (!f && rnd() > .52) d += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  const fin = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
  return `<svg class="qr" viewBox="-1 -1 ${n + 2} ${n + 2}"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><g fill="#0d3b36">${d}${fin(0, 0)}${fin(n - 7, 0)}${fin(0, n - 7)}</g></svg>`;
}

/* ===== Render ===== */
const V = { home, qris, topup, transfer, riwayat, bisnis };
const TABS = [['home', '🏠 Beranda'], ['qris', '📷 Bayar QRIS'], ['topup', '⬆️ Top Up'], ['transfer', '💸 Transfer'], ['riwayat', '🧾 Riwayat'], ['bisnis', '🏪 Bisnis']];
function render() {
  me = db.users.find(u => u.id == me.id);
  $('#nav').innerHTML = TABS.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" onclick="go('${k}')">${l}</button>`).join('');
  $('#who').innerHTML = `<div class="chip">${esc(me.name)}</div><div class="chip bal">${rp(me.balance)}</div>`;
  V[tab]();
  if (note) $('#view').insertAdjacentHTML('afterbegin', note);
}

/* --- Beranda --- */
function home() {
  const sales = mine().filter(x => x.kind === 'penjualan');
  $('#view').innerHTML = `<div class="hero"><small>Total saldo</small><h1>${rp(me.balance)}</h1><small>${esc(me.name)}, ${age(me.dob)} tahun &nbsp;|&nbsp; ${me.phone}</small></div>
  <div class="quick">${[['qris', '📷', 'Bayar QRIS'], ['topup', '⬆️', 'Top Up'], ['transfer', '💸', 'Transfer'], ['bisnis', '🏪', 'Bisnis']].map(([k, i, l]) => `<button onclick="go('${k}')"><span>${i}</span>${l}</button>`).join('')}</div>
  <h3>Bisnis saya</h3>
  ${me.biz ? `<div class="card biz"><div><small>${esc(me.biz.type)}</small><h2>${esc(me.biz.name)}</h2></div><div><small>Total pendapatan</small><b>${rp(sum(sales))}</b><small>${sales.length} penjualan</small></div><button class="btn sm" onclick="go('bisnis')">Buka bisnis</button></div>`
    : `<div class="card"><p class="muted">Belum ada bisnis. Tambahkan toko kelontong, restoran, atau usaha lain untuk menerima pembayaran QRIS.</p><button class="btn sm" style="margin-top:10px" onclick="go('bisnis')">Atur bisnis</button></div>`}
  <div class="bar"><h3 style="margin:0">Transaksi terakhir</h3><button class="link" onclick="go('riwayat')">Lihat semua</button></div>${txTable(mine().slice(0, 5))}`;
}

/* --- Bayar QRIS --- */
function qris() {
  $('#view').innerHTML = `<h2>Bayar dengan QRIS</h2><div class="split">
  <form class="card" style="max-width:none" onsubmit="payQ(event)"><label for="qm">Nama merchant</label><input id="qm" placeholder="mis. Warung Bu Ani" required>
  <label for="qa">Nominal (Rp)</label><input id="qa" type="number" min="1000" required>
  <p class="fee">Saldo kamu: <b>${rp(me.balance)}</b></p><button class="btn">Bayar sekarang</button></form>
  <div><div class="vf">Arahkan kamera ke QRIS merchant</div><small>Mode demo: isi data merchant untuk mensimulasikan hasil pindai.</small></div></div>`;
}
function payQ(e) {
  e.preventDefault();
  const a = +$('#qa').value, m = $('#qm').value.trim();
  if (a > me.balance) return toast('Saldo tidak cukup. Top up dulu untuk melanjutkan.', 'err');
  rec('qris', 'Bayar QRIS: ' + m, 'Pembayaran QRIS ke ' + m, -a); toast('Pembayaran QRIS berhasil ✅'); render();
}

/* --- Top up --- */
const SRC = [['Transfer Bank', ['BCA', 'Mandiri', 'BNI', 'BRI']], ['E-Wallet', ['GoPay', 'OVO', 'DANA', 'ShopeePay']], ['QRIS', ['QRIS']], ['Indomaret', ['Setor tunai di kasir Indomaret']]];
function topup() {
  $('#view').innerHTML = `<h2>Top Up Saldo</h2><form class="card" onsubmit="doTop(event)">
  <label for="ts">Sumber dana</label><select id="ts">${SRC.map(([g, o]) => `<optgroup label="${g}">${o.map(n => `<option value="${g}|${n}">${n}</option>`).join('')}</optgroup>`).join('')}</select>
  <label for="ta">Nominal (Rp)</label><div class="chips">${[20000, 50000, 100000, 200000, 500000].map(n => `<button type="button" onclick="$('#ta').value=${n}">${rp(n)}</button>`).join('')}</div>
  <input id="ta" type="number" min="10000" placeholder="Minimal Rp10.000" required><button class="btn">Top up sekarang</button></form>`;
}
function doTop(e) {
  e.preventDefault();
  const [g, n] = $('#ts').value.split('|'), a = +$('#ta').value;
  if (a < 10000) return toast('Minimal top up Rp10.000', 'err');
  rec('topup', 'Top up via ' + n, g, a);
  if (g === 'Indomaret') noteBox('Kode setoran Indomaret: ' + code(), 'Mode demo: saldo langsung masuk. Di layanan sungguhan, tunjukkan kode ini ke kasir.');
  else if (g === 'Transfer Bank') noteBox('Virtual Account ' + n + ': 8808' + me.phone.slice(-8), 'Mode demo: saldo langsung masuk setelah kamu menekan tombol top up.');
  toast(`Top up ${rp(a)} berhasil ✅`); render();
}

/* --- Transfer ke bank / e-wallet / Indomaret --- */
const TR = {
  bank: { l: 'Bank', fee: 2500, p: ['BCA', 'Mandiri', 'BNI', 'BRI', 'BSI'], f: 'No. rekening' },
  ewallet: { l: 'E-Wallet', fee: 1000, p: ['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja'], f: 'No. HP e-wallet' },
  indomaret: { l: 'Indomaret', fee: 3000, p: ['Tarik tunai di Indomaret'], f: 'Nama penerima' }
};
function transfer() {
  const t = TR[tt];
  $('#view').innerHTML = `<h2>Transfer Uang</h2><div class="seg" style="max-width:520px">${Object.keys(TR).map(k => `<button type="button" class="${k === tt ? 'on' : ''}" onclick="tt='${k}';render()">${TR[k].l}</button>`).join('')}</div>
  <form class="card" onsubmit="doTr(event)"><label for="tp">Tujuan</label><select id="tp">${t.p.map(p => `<option>${p}</option>`).join('')}</select>
  <label for="tg">${t.f}</label><input id="tg" required minlength="3">
  <label for="tn">Nominal (Rp)</label><input id="tn" type="number" min="10000" oninput="upd()" required>
  <p class="fee">Biaya admin ${rp(t.fee)}. Total terpotong: <b id="tot">${rp(t.fee)}</b><br>Saldo kamu: <b>${rp(me.balance)}</b></p><button class="btn">Kirim uang</button></form>`;
}
function upd() { $('#tot').textContent = rp((+$('#tn').value || 0) + TR[tt].fee); }
function doTr(e) {
  e.preventDefault();
  const t = TR[tt], a = +$('#tn').value, p = $('#tp').value, g = $('#tg').value.trim(), tot = a + t.fee;
  if (a < 10000) return toast('Minimal transfer Rp10.000', 'err');
  if (tot > me.balance) return toast('Saldo tidak cukup untuk nominal + biaya admin', 'err');
  rec('transfer', `Transfer ke ${p}: ${g}`, `${t.l}, nominal ${rp(a)} + admin ${rp(t.fee)}`, -tot);
  if (tt === 'indomaret') noteBox('Kode pengambilan: ' + code(), `Penerima (${esc(g)}) menunjukkan kode ini ke kasir Indomaret untuk mengambil ${rp(a)}.`);
  toast('Transfer berhasil ✅'); render();
}

/* --- Riwayat akun --- */
function riwayat() {
  $('#view').innerHTML = `<div class="bar" style="margin-top:0"><h2 style="margin:0">Riwayat Transaksi</h2><button class="btn sm" onclick="exportXls('all')">⬇ Export Excel</button></div>${txTable(mine())}`;
}

/* --- Bisnis: QRIS toko, terima pembayaran, riwayat penjualan --- */
function bisnis() {
  if (!me.biz) {
    $('#view').innerHTML = `<h2>Atur Bisnis</h2><form class="card" onsubmit="setBiz(event)"><label for="bt">Jenis bisnis</label><select id="bt">${TYPES.map(t => `<option>${t}</option>`).join('')}</select>
    <label for="bn">Nama bisnis</label><input id="bn" required><button class="btn">Simpan bisnis</button></form>`; return;
  }
  const sales = mine().filter(x => x.kind === 'penjualan'), td = new Date().toDateString();
  const cat = CAT[me.biz.type] || [];
  const lines = Object.keys(bcart).map(i => ({ n: cat[i][1], q: bcart[i], s: cat[i][2] * bcart[i], i }));
  const total = lines.reduce((s, l) => s + l.s, 0) + man;
  const stat = (l, v) => `<div class="card stat"><small>${l}</small><b>${v}</b></div>`;
  $('#view').innerHTML = `<h2>${esc(me.biz.name)}</h2><p class="muted">${esc(me.biz.type)}</p>
  <div class="stats">${stat('Total pendapatan', rp(sum(sales)))}${stat('Pendapatan hari ini', rp(sum(sales.filter(x => new Date(x.t).toDateString() === td))))}${stat('Jumlah penjualan', sales.length)}</div>
  ${inv ? `<div class="card inv">${qr(me.biz.name + inv.total + inv.id)}<div><span class="qrisbadge">QRIS</span><h3 style="margin:6px 0 0">Tagihan ${esc(me.biz.name)}</h3><h1>${rp(inv.total)}</h1><small>${esc(inv.desc)}</small>
    <button class="btn" onclick="bPaid()">Simulasikan: pelanggan sudah membayar</button><button class="btn alt" onclick="inv=null;render()">Batalkan tagihan</button></div></div>` : ''}
  <div class="split"><div class="card"><h3 style="margin-top:0">Terima pembayaran</h3>
    ${cat.length ? `<div class="grid">${cat.map((c, i) => `<button class="prod" onclick="bAdd(${i})"><span>${c[0]}</span><b>${c[1]}</b><small>${rp(c[2])}</small></button>`).join('')}</div>` : ''}
    ${lines.map(l => `<div class="row"><span>${l.q}× ${l.n}</span><span>${rp(l.s)} <button class="x" onclick="bDec(${l.i})" aria-label="Kurangi">−</button></span></div>`).join('')}
    <label for="mn">Nominal lain (Rp, opsional)</label><input id="mn" type="number" min="0" value="${man || ''}" oninput="man=+this.value||0">
    <div class="row total" style="margin-top:8px"><b>Total tagihan</b><b>${rp(total)}</b></div>
    <button class="btn" onclick="bInvoice()">Buat tagihan QRIS</button></div>
    <div class="card qrcard"><span class="qrisbadge">QRIS</span><h3 style="margin:6px 0 0">${esc(me.biz.name)}</h3>${qr(me.biz.name + me.phone)}<small>QRIS toko (tampilan demo). Pelanggan memindai kode ini untuk membayar.</small></div></div>
  <div class="bar"><h3 style="margin:0">Riwayat penjualan</h3><button class="btn sm" onclick="exportXls('penjualan')">⬇ Export Excel</button></div>${txTable(sales)}`;
}
function setBiz(e) { e.preventDefault(); me.biz = { type: $('#bt').value, name: $('#bn').value.trim() }; save(); toast('Bisnis disimpan ✅'); render(); }
function bAdd(i) { bcart[i] = (bcart[i] || 0) + 1; render(); }
function bDec(i) { if (--bcart[i] <= 0) delete bcart[i]; render(); }
function bInvoice() {
  const cat = CAT[me.biz.type] || [];
  const lines = Object.keys(bcart).map(i => `${bcart[i]}× ${cat[i][1]}`);
  const total = Object.keys(bcart).reduce((s, i) => s + cat[i][2] * bcart[i], 0) + man;
  if (total <= 0) return toast('Pilih produk atau isi nominal dulu', 'err');
  if (man) lines.push('Nominal lain ' + rp(man));
  inv = { total, desc: lines.join(', '), id: Date.now() }; render();
}
function bPaid() {
  rec('penjualan', 'Penjualan QRIS', inv.desc, inv.total);
  inv = null; bcart = {}; man = 0; toast('Pembayaran diterima, saldo bertambah ✅'); render();
}

/* ===== Pulihkan sesi ===== */
const sv = localStorage.getItem(KEY + '_me');
if (sv) { const u = db.users.find(x => x.id == sv); if (u) { me = u; enter(); } }
