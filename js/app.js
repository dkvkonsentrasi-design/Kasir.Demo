import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, setDoc, query, orderBy, limit, serverTimestamp, Timestamp, where, writeBatch } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const dateText = d => d ? new Date(d).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}) : "-";
const todayISO = () => new Date().toISOString().slice(0,10);


let products = [], categories = [], suppliers = [], sales = [], expenses = [], cart = [];

// Reset hanya mengembalikan halaman/modul yang sedang dibuka ke kondisi awal.
// Tidak menghapus atau mengubah data Firebase.
async function resetCurrentPage(){
  const page = location.hash.replace("#","") || "dashboard";

  try{
    cart = [];

    if($("#modalRoot")) {
      $("#modalRoot").innerHTML = "";
    }

    // Muat ulang data terbaru, lalu render ulang halaman saat ini.
    await loadAll();

    const views = {
      dashboard: dashboardView,
      pos: posView,
      products: productsView,
      inventory: inventoryView,
      purchases: purchasesView,
      finance: financeView,
      reports: reportsView
    };

    (views[page] || dashboardView)();

    toast("Halaman berhasil di-reset.");
  }catch(err){
    console.error("Reset halaman gagal:", err);
    toast("Reset gagal. Silakan coba lagi.");
  }
}

window.resetCurrentPage = resetCurrentPage;

const resetButton = () =>
  `<button class="danger-btn reset-page" type="button" onclick="window.resetCurrentPage()">↺ Reset</button>`;


const pageTitles = {
  dashboard:"Dashboard",
  pos:"Kasir / POS",
  products:"Produk",
  inventory:"Stok",
  purchases:"Pembelian",
  finance:"Keuangan",
  reports:"Laporan"
};

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  $("#userEmail").textContent = user.email;

  $("#today").textContent =
    new Date().toLocaleDateString("id-ID",{
      weekday:"long",
      day:"numeric",
      month:"long",
      year:"numeric"
    });

  await loadAll();
  navigate(location.hash.replace("#","") || "dashboard");
});

async function loadAll(){
  const [p,c,s,sa,e] = await Promise.all([
    getDocs(collection(db,"products")),
    getDocs(collection(db,"categories")),
    getDocs(collection(db,"suppliers")),
    getDocs(collection(db,"sales")),
    getDocs(collection(db,"expenses"))
  ]);

  products = p.docs.map(x=>({id:x.id,...x.data()}));
  categories = c.docs.map(x=>({id:x.id,...x.data()}));
  suppliers = s.docs.map(x=>({id:x.id,...x.data()}));
  sales = sa.docs.map(x=>({id:x.id,...x.data()}));
  expenses = e.docs.map(x=>({id:x.id,...x.data()}));
}

function navigate(page){
  if(!pageTitles[page]) page="dashboard";

  location.hash = page;

  $("#pageTitle").textContent = pageTitles[page];

  document.querySelectorAll(".nav-item").forEach(b =>
    b.classList.toggle("active",b.dataset.page===page)
  );

  const views = {
    dashboard:dashboardView,
    pos:posView,
    products:productsView,
    inventory:inventoryView,
    purchases:purchasesView,
    finance:financeView,
    reports:reportsView
  };

  views[page]();
}

document.querySelectorAll(".nav-item").forEach(b =>
  b.addEventListener("click",()=>navigate(b.dataset.page))
);

window.addEventListener("hashchange",() =>
  navigate(location.hash.replace("#",""))
);

$("#menuBtn").onclick = () =>
  $(".sidebar").classList.toggle("open");

$("#logoutBtn").onclick = () =>
  signOut(auth);


/* =========================================================
   DASHBOARD
========================================================= */

function dashboardView(){
  const revenue =
    sales
      .filter(s=>s.date===todayISO())
      .reduce((a,s)=>a+Number(s.total||0),0);

  const expense =
    expenses
      .filter(e=>e.date===todayISO())
      .reduce((a,e)=>a+Number(e.amount||0),0);

  const low =
    products.filter(p =>
      Number(p.stock||0)<=Number(p.minimumStock||5)
    );

  const monthSales =
    sales
      .filter(s=>String(s.date||"").startsWith(todayISO().slice(0,7)))
      .reduce((a,s)=>a+Number(s.total||0),0);

  const last =
    [...sales]
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)))
      .slice(0,7);

  $("#pageContent").innerHTML=`
    <div class="toolbar page-toolbar">
      <div>
        <h2 class="section-title">Ringkasan Bisnis</h2>
        <div class="muted">Data operasional dan indikator hari ini.</div>
      </div>
      ${resetButton()}
    </div>

    <div class="grid cards">
      <div class="card">
        <div class="stat-label">Penjualan Hari Ini</div>
        <div class="stat-value">${money(revenue)}</div>
      </div>

      <div class="card">
        <div class="stat-label">Transaksi Hari Ini</div>
        <div class="stat-value">
          ${sales.filter(s=>s.date===todayISO()).length}
        </div>
      </div>

      <div class="card">
        <div class="stat-label">Pengeluaran Hari Ini</div>
        <div class="stat-value">${money(expense)}</div>
      </div>

      <div class="card">
        <div class="stat-label">Penjualan Bulan Ini</div>
        <div class="stat-value">${money(monthSales)}</div>
      </div>
    </div>

    <div class="grid"
      style="grid-template-columns:1.4fr .8fr;margin-top:18px">

      <div class="panel">
        <h2 class="section-title">
          Penjualan 7 Transaksi Terakhir
        </h2>

        ${
          last.length
          ?
          `<div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Tanggal</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                ${
                  last.map(s=>`
                    <tr>
                      <td>${s.invoice||s.id.slice(0,8)}</td>
                      <td>${dateText(s.date)}</td>
                      <td>${money(s.total)}</td>
                    </tr>
                  `).join("")
                }
              </tbody>
            </table>
          </div>`
          :
          `<div class="empty">Belum ada transaksi.</div>`
        }
      </div>

      <div class="panel">
        <h2 class="section-title">⚠️ Stok Menipis</h2>

        ${
          low.length
          ?
          low.slice(0,8).map(p=>`
            <p>
              ${p.name}
              <span class="badge low">
                ${p.stock||0} ${p.unit||"pcs"}
              </span>
            </p>
          `).join("")
          :
          `<div class="empty">Stok aman.</div>`
        }
      </div>

    </div>`;
}


/* =========================================================
   PRODUK
========================================================= */

function productsView(){

  $("#pageContent").innerHTML=`
  <div class="panel">

    <div class="toolbar">

      <div class="toolbar-left">
        <input
          id="productSearch"
          placeholder="Cari produk..."
        >
      </div>

      <div class="toolbar-right">
        <button id="addProduct" class="primary-btn">
          + Produk
        </button>

        ${resetButton()}
      </div>

    </div>

    <div class="table-wrap">
      <table>

        <thead>
          <tr>
            <th>Produk</th>
            <th>Kategori</th>
            <th>Harga Jual</th>
            <th>Modal</th>
            <th>Stok</th>
            <th>Aksi</th>
          </tr>
        </thead>

        <tbody id="productRows"></tbody>

      </table>
    </div>

  </div>`;

  renderProducts(products);

  $("#productSearch").oninput = e =>
    renderProducts(
      products.filter(p =>
        p.name
          .toLowerCase()
          .includes(e.target.value.toLowerCase())
      )
    );

  $("#addProduct").onclick = () => productModal();
}

function renderProducts(list){

  $("#productRows").innerHTML =
    list.length
    ?
    list.map(p=>`
      <tr>

        <td>
          <b>${p.name}</b>
          <br>
          <span class="muted">${p.sku||""}</span>
        </td>

        <td>${p.categoryName||"-"}</td>

        <td>${money(p.sellingPrice)}</td>

        <td>${money(p.costPrice)}</td>

        <td>${p.stock||0} ${p.unit||""}</td>

        <td>
          <button
            class="secondary-btn"
            onclick='window.editProduct("${p.id}")'>
            Edit
          </button>

          <button
            class="danger-btn"
            onclick='window.removeProduct("${p.id}")'>
            Hapus
          </button>
        </td>

      </tr>
    `).join("")
    :
    `<tr>
      <td colspan="6" class="empty">
        Belum ada produk.
      </td>
    </tr>`;
}

window.editProduct = id =>
  productModal(products.find(p=>p.id===id));

window.removeProduct = async id => {

  if(confirm("Hapus produk ini?")){

    await deleteDoc(
      doc(db,"products",id)
    );

    await loadAll();
    productsView();

    toast("Produk dihapus");
  }
};

function productModal(p={}){

  $("#modalRoot").innerHTML=`
  <div class="modal">

    <div class="modal-box">

      <div class="modal-head">
        <h2>
          ${p.id?"Edit":"Tambah"} Produk
        </h2>

        <button
          class="close"
          onclick="closeModal()">
          ✕
        </button>
      </div>

      <form id="productForm">

        <div class="form-grid">

          <div class="form-group">
            <label>Nama Produk</label>
            <input
              name="name"
              required
              value="${p.name||""}">
          </div>

          <div class="form-group">
            <label>SKU</label>
            <input
              name="sku"
              value="${p.sku||""}">
          </div>

          <div class="form-group">
            <label>Kategori</label>
            <input
              name="categoryName"
              value="${p.categoryName||""}"
              placeholder="Pop Ice / Jajanan">
          </div>

          <div class="form-group">
            <label>Satuan</label>
            <input
              name="unit"
              value="${p.unit||"pcs"}">
          </div>

          <div class="form-group">
            <label>Harga Jual</label>
            <input
              name="sellingPrice"
              type="number"
              min="0"
              required
              value="${p.sellingPrice||0}">
          </div>

          <div class="form-group">
            <label>Harga Modal</label>
            <input
              name="costPrice"
              type="number"
              min="0"
              value="${p.costPrice||0}">
          </div>

          <div class="form-group">
            <label>Stok</label>
            <input
              name="stock"
              type="number"
              min="0"
              value="${p.stock||0}">
          </div>

          <div class="form-group">
            <label>Minimum Stok</label>
            <input
              name="minimumStock"
              type="number"
              min="0"
              value="${p.minimumStock??5}">
          </div>

        </div>

        <div class="modal-actions">

          <button
            type="button"
            class="secondary-btn"
            onclick="closeModal()">
            Batal
          </button>

          <button class="primary-btn">
            Simpan
          </button>

        </div>

      </form>

    </div>

  </div>`;

  $("#productForm").onsubmit = async e => {

    e.preventDefault();

    const f = new FormData(e.target);

    const data = {
      name:f.get("name"),
      sku:f.get("sku"),
      categoryName:f.get("categoryName"),
      unit:f.get("unit"),
      sellingPrice:Number(f.get("sellingPrice")),
      costPrice:Number(f.get("costPrice")),
      stock:Number(f.get("stock")),
      minimumStock:Number(f.get("minimumStock")),
      updatedAt:serverTimestamp()
    };

    if(p.id){

      await updateDoc(
        doc(db,"products",p.id),
        data
      );

    }else{

      await addDoc(
        collection(db,"products"),
        {
          ...data,
          createdAt:serverTimestamp()
        }
      );

    }

    closeModal();

    await loadAll();

    productsView();

    toast("Produk tersimpan");
  };
}


/* =========================================================
   KASIR / POS
========================================================= */

function posView(){

  $("#pageContent").innerHTML=`

  <div class="toolbar page-toolbar">

    <div>
      <h2 class="section-title">
        Kasir / POS
      </h2>

      <div class="muted">
        Buat transaksi penjualan dan uji alur pembayaran.
      </div>
    </div>

    ${resetButton()}

  </div>

  <div class="pos-grid">

    <div class="panel">

      <div class="toolbar">

        <input
          id="posSearch"
          placeholder="Cari produk...">

      </div>

      <div
        id="posProducts"
        class="product-grid">
      </div>

    </div>

    <div class="panel">

      <h2 class="section-title">
        Keranjang
      </h2>

      <div id="cartRows"></div>

      <div class="total-box">
        <span>Total</span>
        <span id="cartTotal">${money(0)}</span>
      </div>

      <label>
        Metode Pembayaran
      </label>

      <select id="paymentMethod">
        <option>Tunai</option>
        <option>QRIS</option>
        <option>Transfer</option>
        <option>E-Wallet</option>
      </select>

      <button
        id="checkout"
        class="primary-btn full"
        style="margin-top:15px">
        Bayar
      </button>

    </div>

  </div>`;

  renderPosProducts(products);
  renderCart();

  $("#posSearch").oninput = e =>
    renderPosProducts(
      products.filter(p =>
        p.name
          .toLowerCase()
          .includes(e.target.value.toLowerCase())
      )
    );

  $("#checkout").onclick = checkout;
}

function renderPosProducts(list){

  $("#posProducts").innerHTML =
    list.length
    ?
    list.map(p=>`

      <div class="product-card">

        <h3>${p.name}</h3>

        <div>
          ${money(p.sellingPrice)}
        </div>

        <small class="muted">
          Stok: ${p.stock||0}
        </small>

        <button
          class="primary-btn"
          onclick='window.addCart("${p.id}")'>
          Tambah
        </button>

      </div>

    `).join("")
    :
    `<div class="empty">
      Produk tidak ditemukan.
    </div>`;
}

window.addCart = id => {

  const p = products.find(x=>x.id===id);

  if(!p || Number(p.stock)<=0)
    return toast("Stok habis");

  const item = cart.find(x=>x.id===id);

  if(item){

    if(item.qty>=Number(p.stock))
      return toast("Melebihi stok");

    item.qty++;

  }else{

    cart.push({
      id:p.id,
      name:p.name,
      price:Number(p.sellingPrice),
      qty:1
    });

  }

  renderCart();
};

window.changeQty = (id,delta) => {

  const x = cart.find(i=>i.id===id);

  if(!x) return;

  x.qty += delta;

  const p = products.find(p=>p.id===id);

  if(x.qty<=0){

    cart = cart.filter(i=>i.id!==id);

  }else if(
    p &&
    x.qty>Number(p.stock||0)
  ){

    x.qty = Number(p.stock||0);

    if(x.qty<=0)
      cart = cart.filter(i=>i.id!==id);

    toast("Jumlah melebihi stok tersedia");
  }

  renderCart();
};

function renderCart(){

  const el = $("#cartRows");

  if(!el) return;

  el.innerHTML =
    cart.length
    ?
    cart.map(x=>`

      <div class="cart-row">

        <div>
          ${x.name}
          <br>
          <span class="muted">
            ${money(x.price)} × ${x.qty}
          </span>
        </div>

        <div class="qty">

          <button
            onclick='window.changeQty("${x.id}",-1)'>
            −
          </button>

          <b>${x.qty}</b>

          <button
            onclick='window.changeQty("${x.id}",1)'>
            +
          </button>

        </div>

        <b>
          ${money(x.price*x.qty)}
        </b>

      </div>

    `).join("")
    :
    `<div class="empty">
      Keranjang kosong.
    </div>`;

  const total =
    cart.reduce(
      (a,x)=>a+x.price*x.qty,
      0
    );

  $("#cartTotal").textContent = money(total);
}

async function checkout(){

  if(!cart.length)
    return toast("Keranjang kosong");

  const total =
    cart.reduce(
      (a,x)=>a+x.price*x.qty,
      0
    );

  const invoice = "TRX-"+Date.now();

  try{

    const batch = writeBatch(db);

    const saleRef =
      doc(collection(db,"sales"));

    batch.set(saleRef,{
      invoice,
      date:todayISO(),
      total,
      paymentMethod:$("#paymentMethod").value,

      items:cart.map(x=>{

        const product =
          products.find(p=>p.id===x.id);

        return {
          productId:x.id,
          name:x.name,
          qty:x.qty,
          price:x.price,
          costPrice:Number(product?.costPrice||0)
        };

      }),

      createdAt:serverTimestamp()
    });

    for(const x of cart){

      const p =
        products.find(p=>p.id===x.id);

      if(
        !p ||
        Number(p.stock||0)<x.qty
      ){
        throw new Error(
          `Stok ${x.name} tidak mencukupi.`
        );
      }

      batch.update(
        doc(db,"products",x.id),
        {
          stock:Number(p.stock||0)-x.qty,
          updatedAt:serverTimestamp()
        }
      );

      const movementRef =
        doc(collection(db,"stock_movements"));

      batch.set(movementRef,{
        productId:x.id,
        type:"SALE",
        qty:-x.qty,
        reference:invoice,
        date:todayISO(),
        createdAt:serverTimestamp()
      });

    }

    await batch.commit();

    cart=[];

    await loadAll();

    posView();

    toast("Transaksi berhasil: "+invoice);

  }catch(err){

    console.error(
      "Checkout gagal:",
      err
    );

    toast(
      err.message ||
      "Transaksi gagal. Tidak ada perubahan yang disimpan."
    );
  }
}


/* =========================================================
   STOK
========================================================= */

function inventoryView(){

  const sorted =
    [...products].sort(
      (a,b)=>
        Number(a.stock||0)-
        Number(b.stock||0)
    );

  $("#pageContent").innerHTML=`

  <div class="panel">

    <div class="toolbar">

      <h2 class="section-title">
        Persediaan
      </h2>

      <div class="toolbar-right">

        <button
          id="stockIn"
          class="primary-btn">
          + Stok Masuk
        </button>

        ${resetButton()}

      </div>

    </div>

    <div class="table-wrap">

      <table>

        <thead>
          <tr>
            <th>Produk</th>
            <th>Stok</th>
            <th>Minimum</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          ${
            sorted.map(p=>`

              <tr>

                <td>${p.name}</td>

                <td>
                  <b>${p.stock||0}</b>
                  ${p.unit||""}
                </td>

                <td>
                  ${p.minimumStock??5}
                </td>

                <td>
                  ${
                    Number(p.stock||0)<=
                    Number(p.minimumStock??5)
                    ?
                    '<span class="badge low">Menipis</span>'
                    :
                    '<span class="badge">Aman</span>'
                  }
                </td>

              </tr>

            `).join("")
          }

        </tbody>

      </table>

    </div>

  </div>`;

  $("#stockIn").onclick = stockModal;
}

function stockModal(){

  $("#modalRoot").innerHTML=`

  <div class="modal">

    <div class="modal-box">

      <div class="modal-head">

        <h2>Stok Masuk</h2>

        <button
          class="close"
          onclick="closeModal()">
          ✕
        </button>

      </div>

      <form id="stockForm">

        <div class="form-group">

          <label>Produk</label>

          <select name="product">

            ${
              products.map(p=>`
                <option value="${p.id}">
                  ${p.name}
                  (stok ${p.stock||0})
                </option>
              `).join("")
            }

          </select>

        </div>

        <div class="form-group">

          <label>Jumlah</label>

          <input
            name="qty"
            type="number"
            min="1"
            required>

        </div>

        <div class="form-group">

          <label>Keterangan</label>

          <input name="note">

        </div>

        <div class="modal-actions">

          <button
            type="button"
            class="secondary-btn"
            onclick="closeModal()">
            Batal
          </button>

          <button class="primary-btn">
            Simpan
          </button>

        </div>

      </form>

    </div>

  </div>`;

  $("#stockForm").onsubmit = async e => {

    e.preventDefault();

    const f = new FormData(e.target);

    const id = f.get("product");
    const qty = Number(f.get("qty"));

    const p =
      products.find(x=>x.id===id);

    await updateDoc(
      doc(db,"products",id),
      {
        stock:Number(p.stock||0)+qty,
        updatedAt:serverTimestamp()
      }
    );

    await addDoc(
      collection(db,"stock_movements"),
      {
        productId:id,
        type:"PURCHASE",
        qty,
        reference:f.get("note")||"Stok masuk",
        date:todayISO(),
        createdAt:serverTimestamp()
      }
    );

    closeModal();

    await loadAll();

    inventoryView();

    toast("Stok berhasil ditambah");
  };
}


/* =========================================================
   PEMBELIAN
========================================================= */

function purchasesView(){

  $("#pageContent").innerHTML=`

  <div class="panel">

    <div class="toolbar">

      <h2 class="section-title">
        Pembelian / Supplier
      </h2>

      <div class="toolbar-right">

        <button
          id="purchaseBtn"
          class="primary-btn">
          + Catat Pembelian
        </button>

        ${resetButton()}

      </div>

    </div>

    <div class="table-wrap">

      <table>

        <thead>
          <tr>
            <th>Supplier</th>
            <th>Tanggal</th>
            <th>Produk</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody id="purchaseRows"></tbody>

      </table>

    </div>

  </div>`;

  loadPurchases();

  $("#purchaseBtn").onclick =
    purchaseModal;
}

async function loadPurchases(){

  const snap =
    await getDocs(
      collection(db,"purchases")
    );

  const list =
    snap.docs.map(
      x=>({id:x.id,...x.data()})
    );

  $("#purchaseRows").innerHTML =
    list.length
    ?
    list.map(p=>`

      <tr>

        <td>${p.supplierName||"-"}</td>

        <td>${dateText(p.date)}</td>

        <td>
          ${p.productName||"-"}
          × ${p.qty||0}
        </td>

        <td>${money(p.total)}</td>

      </tr>

    `).join("")
    :
    `<tr>
      <td colspan="4" class="empty">
        Belum ada pembelian.
      </td>
    </tr>`;
}

function purchaseModal(){

  $("#modalRoot").innerHTML=`

  <div class="modal">

    <div class="modal-box">

      <div class="modal-head">

        <h2>Catat Pembelian</h2>

        <button
          class="close"
          onclick="closeModal()">
          ✕
        </button>

      </div>

      <form id="purchaseForm">

        <div class="form-grid">

          <div class="form-group">

            <label>Supplier</label>

            <input
              name="supplierName"
              required
              placeholder="Nama supplier">

          </div>

          <div class="form-group">

            <label>Tanggal</label>

            <input
              name="date"
              type="date"
              value="${todayISO()}"
              required>

          </div>

          <div class="form-group">

            <label>Produk</label>

            <select name="productId">

              ${
                products.map(p=>`
                  <option value="${p.id}">
                    ${p.name}
                  </option>
                `).join("")
              }

            </select>

          </div>

          <div class="form-group">

            <label>Jumlah</label>

            <input
              name="qty"
              type="number"
              min="1"
              required>

          </div>

          <div class="form-group">

            <label>Harga Modal / Unit</label>

            <input
              name="cost"
              type="number"
              min="0"
              required>

          </div>

        </div>

        <div class="modal-actions">

          <button
            type="button"
            class="secondary-btn"
            onclick="closeModal()">
            Batal
          </button>

          <button class="primary-btn">
            Simpan
          </button>

        </div>

      </form>

    </div>

  </div>`;

  $("#purchaseForm").onsubmit = async e => {

    e.preventDefault();

    const f =
      new FormData(e.target);

    const id = f.get("productId");
    const qty = Number(f.get("qty"));
    const cost = Number(f.get("cost"));

    const p =
      products.find(x=>x.id===id);

    const total = qty * cost;

    await addDoc(
      collection(db,"purchases"),
      {
        supplierName:f.get("supplierName"),
        date:f.get("date"),
        productId:id,
        productName:p.name,
        qty,
        cost,
        total,
        createdAt:serverTimestamp()
      }
    );

    await updateDoc(
      doc(db,"products",id),
      {
        stock:Number(p.stock||0)+qty,
        costPrice:cost,
        updatedAt:serverTimestamp()
      }
    );

    await addDoc(
      collection(db,"stock_movements"),
      {
        productId:id,
        type:"PURCHASE",
        qty,
        reference:"Pembelian",
        date:f.get("date"),
        createdAt:serverTimestamp()
      }
    );

    closeModal();

    await loadAll();

    purchasesView();

    toast("Pembelian tersimpan");
  };
}


/* =========================================================
   KEUANGAN
========================================================= */

function financeView(){

  const rev =
    sales.reduce(
      (a,s)=>a+Number(s.total||0),
      0
    );

  const exp =
    expenses.reduce(
      (a,e)=>a+Number(e.amount||0),
      0
    );

  $("#pageContent").innerHTML=`

  <div class="grid cards">

    <div class="card">
      <div class="stat-label">
        Total Penjualan
      </div>
      <div class="stat-value">
        ${money(rev)}
      </div>
    </div>

    <div class="card">
      <div class="stat-label">
        Total Pengeluaran
      </div>
      <div class="stat-value">
        ${money(exp)}
      </div>
    </div>

    <div class="card">
      <div class="stat-label">
        Selisih Kas
      </div>
      <div class="stat-value">
        ${money(rev-exp)}
      </div>
    </div>

    <div class="card">
      <div class="stat-label">
        Transaksi
      </div>
      <div class="stat-value">
        ${sales.length}
      </div>
    </div>

  </div>

  <div
    class="panel"
    style="margin-top:18px">

    <div class="toolbar">

      <h2 class="section-title">
        Pengeluaran
      </h2>

      <div class="toolbar-right">

        <button
          id="expenseBtn"
          class="primary-btn">
          + Pengeluaran
        </button>

        ${resetButton()}

      </div>

    </div>

    <div class="table-wrap">

      <table>

        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Kategori</th>
            <th>Keterangan</th>
            <th>Jumlah</th>
          </tr>
        </thead>

        <tbody>

          ${
            expenses.map(e=>`

              <tr>
                <td>${dateText(e.date)}</td>
                <td>${e.category}</td>
                <td>${e.description||"-"}</td>
                <td>${money(e.amount)}</td>
              </tr>

            `).join("")
            ||
            `
            <tr>
              <td colspan="4" class="empty">
                Belum ada pengeluaran.
              </td>
            </tr>
            `
          }

        </tbody>

      </table>

    </div>

  </div>`;

  $("#expenseBtn").onclick =
    expenseModal;
}

function expenseModal(){

  $("#modalRoot").innerHTML=`

  <div class="modal">

    <div class="modal-box">

      <div class="modal-head">

        <h2>
          Tambah Pengeluaran
        </h2>

        <button
          class="close"
          onclick="closeModal()">
          ✕
        </button>

      </div>

      <form id="expenseForm">

        <div class="form-grid">

          <div class="form-group">

            <label>Tanggal</label>

            <input
              name="date"
              type="date"
              value="${todayISO()}"
              required>

          </div>

          <div class="form-group">

            <label>Kategori</label>

            <input
              name="category"
              required
              placeholder="Listrik / Bahan / Operasional">

          </div>

          <div class="form-group">

            <label>Jumlah</label>

            <input
              name="amount"
              type="number"
              min="0"
              required>

          </div>

          <div class="form-group">

            <label>Keterangan</label>

            <input name="description">

          </div>

        </div>

        <div class="modal-actions">

          <button
            type="button"
            class="secondary-btn"
            onclick="closeModal()">
            Batal
          </button>

          <button class="primary-btn">
            Simpan
          </button>

        </div>

      </form>

    </div>

  </div>`;

  $("#expenseForm").onsubmit = async e => {

    e.preventDefault();

    const f =
      new FormData(e.target);

    await addDoc(
      collection(db,"expenses"),
      {
        date:f.get("date"),
        category:f.get("category"),
        amount:Number(f.get("amount")),
        description:f.get("description"),
        createdAt:serverTimestamp()
      }
    );

    closeModal();

    await loadAll();

    financeView();

    toast("Pengeluaran tersimpan");
  };
}


/* =========================================================
   LAPORAN
========================================================= */

function reportsView(){

  const rev =
    sales.reduce(
      (a,s)=>a+Number(s.total||0),
      0
    );

  const cost =
    sales.reduce(
      (a,s)=>
        a+
        (s.items||[]).reduce(
          (b,i)=>
            b+
            Number(i.costPrice||0)*
            Number(i.qty||0),
          0
        ),
      0
    );

  const exp =
    expenses.reduce(
      (a,e)=>a+Number(e.amount||0),
      0
    );

  $("#pageContent").innerHTML=`

  <div class="grid cards">

    <div class="card">
      <div class="stat-label">
        Penjualan
      </div>
      <div class="stat-value">
        ${money(rev)}
      </div>
    </div>

    <div class="card">
      <div class="stat-label">
        Estimasi HPP
      </div>
      <div class="stat-value">
        ${money(cost)}
      </div>
    </div>

    <div class="card">
      <div class="stat-label">
        Pengeluaran
      </div>
      <div class="stat-value">
        ${money(exp)}
      </div>
    </div>

    <div class="card">
      <div class="stat-label">
        Laba Kotor*
      </div>
      <div class="stat-value">
        ${money(rev-cost-exp)}
      </div>
    </div>

  </div>

  <div
    class="panel"
    style="margin-top:18px">

    <div class="toolbar page-toolbar">

      <h2 class="section-title">
        Ringkasan Laporan
      </h2>

      ${resetButton()}

    </div>

    <p class="muted">
      *HPP dihitung dari snapshot harga modal
      yang disimpan saat transaksi kasir,
      sehingga perubahan harga modal produk
      tidak mengubah transaksi lama.
    </p>

    <h2>
      Ringkasan Produk
    </h2>

    <div class="table-wrap">

      <table>

        <thead>
          <tr>
            <th>Produk</th>
            <th>Harga Jual</th>
            <th>Modal</th>
            <th>Margin/Unit</th>
            <th>Stok</th>
          </tr>
        </thead>

        <tbody>

          ${
            products.map(p=>`

              <tr>

                <td>${p.name}</td>

                <td>
                  ${money(p.sellingPrice)}
                </td>

                <td>
                  ${money(p.costPrice)}
                </td>

                <td>
                  ${
                    money(
                      Number(p.sellingPrice||0)-
                      Number(p.costPrice||0)
                    )
                  }
                </td>

                <td>
                  ${p.stock||0}
                </td>

              </tr>

            `).join("")
          }

        </tbody>

      </table>

    </div>

  </div>`;
}


/* =========================================================
   MODAL & TOAST
========================================================= */

window.closeModal = () =>
  $("#modalRoot").innerHTML = "";

function toast(msg){

  const t =
    document.createElement("div");

  t.className = "toast";
  t.textContent = msg;

  $("#toast").appendChild(t);

  setTimeout(
    ()=>t.remove(),
    2800
  );
}
