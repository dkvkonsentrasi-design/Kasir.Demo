import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================================
   HELPER
========================================================= */

const $ = selector => document.querySelector(selector);

const money = value =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);


const dateText = value => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};


const todayISO = () =>
  new Date().toISOString().slice(0, 10);


const normalizeNumber = value =>
  Number(value) || 0;


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function getProductUnit(productId) {
  const product = products.find(
    p => p.id === productId
  );

  return product?.unit || "pcs";
}


function getProductName(productId) {
  const product = products.find(
    p => p.id === productId
  );

  return product?.name || "-";
}


/* =========================================================
   DATA
========================================================= */

let products = [];
let categories = [];
let suppliers = [];
let sales = [];
let expenses = [];
let purchases = [];
let cart = [];


/* =========================================================
   PAGE TITLE
========================================================= */

const pageTitles = {
  dashboard: "Dashboard",
  pos: "Kasir / POS",
  products: "Produk",
  inventory: "Stok",
  purchases: "Pembelian",
  finance: "Keuangan",
  reports: "Laporan"
};


/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(auth, async user => {

  if (!user) {
    location.href = "login.html";
    return;
  }

  const userEmail = $("#userEmail");

  if (userEmail) {
    userEmail.textContent =
      user.email || "User";
  }


  const today = $("#today");

  if (today) {
    today.textContent =
      new Date().toLocaleDateString(
        "id-ID",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        }
      );
  }


  try {

    await loadAll();

    navigate(
      location.hash.replace("#", "") ||
      "dashboard"
    );

  } catch (error) {

    console.error(
      "Initial Load Error:",
      error
    );

    toast(
      "Gagal memuat data aplikasi."
    );

  }

});


/* =========================================================
   LOAD ALL DATA
========================================================= */

async function loadAll() {

  const [
    productSnapshot,
    categorySnapshot,
    supplierSnapshot,
    salesSnapshot,
    expenseSnapshot,
    purchaseSnapshot
  ] = await Promise.all([

    getDocs(
      collection(
        db,
        "products"
      )
    ),

    getDocs(
      collection(
        db,
        "categories"
      )
    ),

    getDocs(
      collection(
        db,
        "suppliers"
      )
    ),

    getDocs(
      collection(
        db,
        "sales"
      )
    ),

    getDocs(
      collection(
        db,
        "expenses"
      )
    ),

    getDocs(
      collection(
        db,
        "purchases"
      )
    )

  ]);


  products =
    productSnapshot.docs.map(
      item => ({
        id: item.id,
        ...item.data()
      })
    );


  categories =
    categorySnapshot.docs.map(
      item => ({
        id: item.id,
        ...item.data()
      })
    );


  suppliers =
    supplierSnapshot.docs.map(
      item => ({
        id: item.id,
        ...item.data()
      })
    );


  sales =
    salesSnapshot.docs.map(
      item => ({
        id: item.id,
        ...item.data()
      })
    );


  expenses =
    expenseSnapshot.docs.map(
      item => ({
        id: item.id,
        ...item.data()
      })
    );


  purchases =
    purchaseSnapshot.docs
      .map(
        item => ({
          id: item.id,
          ...item.data()
        })
      )
      .sort(
        (a, b) =>
          String(b.date || "")
            .localeCompare(
              String(a.date || "")
            )
      );

}


/* =========================================================
   NAVIGATION
========================================================= */

function navigate(page) {

  if (!pageTitles[page]) {
    page = "dashboard";
  }


  if (
    location.hash.replace("#", "") !== page
  ) {
    history.replaceState(
      null,
      "",
      `#${page}`
    );
  }


  const pageTitle = $("#pageTitle");

  if (pageTitle) {
    pageTitle.textContent =
      pageTitles[page];
  }


  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });


  const views = {
    dashboard: dashboardView,
    pos: posView,
    products: productsView,
    inventory: inventoryView,
    purchases: purchasesView,
    finance: financeView,
    reports: reportsView
  };


  if (views[page]) {
    views[page]();
  }

}


/* =========================================================
   NAVIGATION EVENTS
========================================================= */

document
  .querySelectorAll(".nav-item")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        navigate(
          button.dataset.page
        );

        const sidebar =
          $(".sidebar");

        if (sidebar) {
          sidebar.classList.remove(
            "open"
          );
        }

      }
    );

  });


window.addEventListener(
  "hashchange",
  () => {

    navigate(
      location.hash.replace("#", "") ||
      "dashboard"
    );

  }
);


const menuButton = $("#menuBtn");

if (menuButton) {

  menuButton.onclick = () => {

    const sidebar =
      $(".sidebar");

    if (sidebar) {
      sidebar.classList.toggle(
        "open"
      );
    }

  };

}


const logoutButton = $("#logoutBtn");

if (logoutButton) {

  logoutButton.onclick = async () => {

    try {

      await signOut(auth);

    } catch (error) {

      console.error(
        "Logout Error:",
        error
      );

      toast(
        "Gagal logout."
      );

    }

  };

}


/* =========================================================
   DASHBOARD
========================================================= */

function dashboardView() {

  const today =
    todayISO();


  const todaySales =
    sales.filter(
      sale =>
        sale.date === today
    );


  const revenue =
    todaySales.reduce(
      (total, sale) =>
        total +
        normalizeNumber(
          sale.total
        ),
      0
    );


  const expense =
    expenses
      .filter(
        item =>
          item.date === today
      )
      .reduce(
        (total, item) =>
          total +
          normalizeNumber(
            item.amount
          ),
        0
      );


  const lowStock =
    products.filter(
      product =>
        normalizeNumber(
          product.stock
        ) <=
        normalizeNumber(
          product.minimumStock ?? 5
        )
    );


  const currentMonth =
    today.slice(0, 7);


  const monthSales =
    sales
      .filter(
        sale =>
          String(
            sale.date || ""
          ).startsWith(
            currentMonth
          )
      )
      .reduce(
        (total, sale) =>
          total +
          normalizeNumber(
            sale.total
          ),
        0
      );


  /* =====================================================
     7 TRANSAKSI TERAKHIR
  ===================================================== */

const latestSales =
  [...sales]
    .sort(
      (a, b) => {

        const dateA =
          a.createdAt?.seconds
            ? Number(a.createdAt.seconds)
            : new Date(a.date || 0).getTime();

        const dateB =
          b.createdAt?.seconds
            ? Number(b.createdAt.seconds)
            : new Date(b.date || 0).getTime();

        return dateB - dateA;
      }
    );


  const content =
    $("#pageContent");


  if (!content) {
    return;
  }


  content.innerHTML = `

    <div
      class="toolbar"
      style="margin-bottom:18px"
    >

      <div>

        <h2
          class="section-title"
          style="margin:0"
        >
          Dashboard
        </h2>


        <div class="muted">
          Ringkasan penjualan, stok dan keuangan
        </div>

      </div>


      <button
        id="resetDashboard"
        class="danger-btn"
        type="button"
      >
        ↻ Reset Semua Data
      </button>

    </div>


    <!-- =================================================
         RINGKASAN
    ================================================== -->

    <div class="grid cards">


      <div class="card">

        <div class="stat-label">
          Penjualan Hari Ini
        </div>


        <div class="stat-value">
          ${money(revenue)}
        </div>

      </div>


      <div class="card">

        <div class="stat-label">
          Transaksi Hari Ini
        </div>


        <div class="stat-value">
          ${todaySales.length}
        </div>

      </div>


      <div class="card">

        <div class="stat-label">
          Pengeluaran Hari Ini
        </div>


        <div class="stat-value">
          ${money(expense)}
        </div>

      </div>


      <div class="card">

        <div class="stat-label">
          Penjualan Bulan Ini
        </div>


        <div class="stat-value">
          ${money(monthSales)}
        </div>

      </div>


    </div>


    <!-- =================================================
         TRANSAKSI + STOK
    ================================================== -->

    <div
      class="grid"
      style="
        grid-template-columns:1.4fr .8fr;
        margin-top:18px
      "
    >


      <!-- ===============================================
           TRANSAKSI TERAKHIR
      ================================================ -->

      <div class="panel">


        <h2 class="section-title">
          Penjualan 7 Transaksi Terakhir
        </h2>


        ${
          latestSales.length

            ? `

              <div class="table-wrap">

                <table>

                  <thead>

                    <tr>

                      <th>
                        Invoice
                      </th>


                      <th>
                        Tanggal
                      </th>


                      <th>
                        Produk Terjual
                      </th>


                      <th>
                        Jumlah
                      </th>


                      <th>
                        Total
                      </th>

                    </tr>

                  </thead>


                  <tbody>


                    ${
                      latestSales
                        .map(
                          sale => {

                            /*
                             * Ambil item yang dijual
                             */

                            const items =
                              Array.isArray(
                                sale.items
                              )
                                ? sale.items
                                : [];


                            /*
                             * Nama produk
                             */

                            const productNames =
                              items.length

                                ? items
                                    .map(
                                      item =>
                                        escapeHTML(
                                          item.name ||
                                          getProductName(
                                            item.productId
                                          ) ||
                                          "-"
                                        )
                                    )
                                    .join(
                                      "<br>"
                                    )

                                : "-";


                            /*
                             * Jumlah produk
                             */

                            const quantities =
                              items.length

                                ? items
                                    .map(
                                      item => {

                                        const qty =
                                          normalizeNumber(
                                            item.qty
                                          );


                                        const unit =
                                          getProductUnit(
                                            item.productId
                                          );


                                        return `
                                          ${qty}
                                          ${escapeHTML(
                                            unit
                                          )}
                                        `;

                                      }
                                    )
                                    .join(
                                      "<br>"
                                    )

                                : "-";


                            return `

                              <tr>


                                <!-- INVOICE -->

                                <td>

                                  ${escapeHTML(
                                    sale.invoice ||
                                    sale.id?.slice(
                                      0,
                                      8
                                    ) ||
                                    "-"
                                  )}

                                </td>


                                <!-- TANGGAL -->

                                <td>

                                  ${dateText(
                                    sale.date
                                  )}

                                </td>


                                <!-- PRODUK -->

                                <td>

                                  ${
                                    productNames
                                  }

                                </td>


                                <!-- JUMLAH -->

                                <td>

                                  ${
                                    quantities
                                  }

                                </td>


                                <!-- TOTAL -->

                                <td>

                                  ${money(
                                    sale.total
                                  )}

                                </td>


                              </tr>

                            `;

                          }
                        )
                        .join("")
                    }


                  </tbody>

                </table>

              </div>

            `

            : `

              <div class="empty">

                Belum ada transaksi.

              </div>

            `
        }


      </div>


      <!-- ===============================================
           STOK MENIPIS
      ================================================ -->

      <div class="panel">


        <h2 class="section-title">
          ⚠️ Stok Menipis
        </h2>


        ${
          lowStock.length

            ? lowStock
                .slice(
                  0,
                  8
                )
                .map(
                  product => `

                    <p>

                      ${escapeHTML(
                        product.name
                      )}


                      <span
                        class="badge low"
                      >

                        ${normalizeNumber(
                          product.stock
                        )}

                        ${escapeHTML(
                          product.unit ||
                          "pcs"
                        )}

                      </span>

                    </p>

                  `
                )
                .join("")

            : `

              <div class="empty">

                Stok aman.

              </div>

            `
        }


      </div>


    </div>

  `;


  /* =====================================================
     RESET BUTTON
  ===================================================== */

  const resetButton =
    $("#resetDashboard");


  if (resetButton) {

    resetButton.onclick =
      resetDashboard;

  }

}


/* =========================================================
   RESET DATA
========================================================= */

async function resetDashboard() {

  const confirmFirst =
    confirm(
      "⚠️ PERINGATAN!\n\n" +
      "Reset Semua Data akan menghapus seluruh data aplikasi:\n\n" +
      "• Produk\n" +
      "• Kategori\n" +
      "• Supplier\n" +
      "• Penjualan\n" +
      "• Pengeluaran\n" +
      "• Pembelian\n" +
      "• Riwayat Stok\n\n" +
      "Data yang sudah dihapus TIDAK dapat dikembalikan.\n\n" +
      "Apakah Anda yakin ingin melanjutkan?"
    );


  if (!confirmFirst) {
    return;
  }


  const confirmSecond =
    confirm(
      "🚨 KONFIRMASI TERAKHIR\n\n" +
      "SEMUA DATA APLIKASI AKAN DIHAPUS.\n\n" +
      "Produk, transaksi, pembelian, pengeluaran, dan riwayat stok akan dihapus.\n\n" +
      "Apakah Anda benar-benar yakin?"
    );


  if (!confirmSecond) {
    return;
  }


  try {

    const collectionsToReset = [
      "products",
      "categories",
      "suppliers",
      "sales",
      "expenses",
      "purchases",
      "stock_movements"
    ];


    let totalDeleted = 0;


    for (
      const collectionName
      of collectionsToReset
    ) {

      const snapshot =
        await getDocs(
          collection(
            db,
            collectionName
          )
        );


      for (
        const item
        of snapshot.docs
      ) {

        await deleteDoc(
          doc(
            db,
            collectionName,
            item.id
          )
        );

        totalDeleted++;

      }

    }


    products = [];
    categories = [];
    suppliers = [];
    sales = [];
    expenses = [];
    purchases = [];
    cart = [];


    await loadAll();

    dashboardView();


    toast(
      `Reset berhasil. ${totalDeleted} data telah dihapus.`
    );


  } catch (error) {

    console.error(
      "Reset Dashboard Error:",
      error
    );

    toast(
      "Gagal melakukan reset data."
    );

  }

}


/* =========================================================
   PRODUCTS
========================================================= */

function productsView() {

  const content =
    $("#pageContent");

  if (!content) {
    return;
  }


  content.innerHTML = `

    <div class="panel">

      <div class="toolbar">

        <div class="toolbar-left">

          <input
            id="productSearch"
            placeholder="Cari produk..."
          >

        </div>


        <button
          id="addProduct"
          class="primary-btn"
        >
          + Produk
        </button>

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

    </div>

  `;


  renderProducts(products);


  const search =
    $("#productSearch");

  if (search) {

    search.oninput = event => {

      const keyword =
        event.target.value
          .trim()
          .toLowerCase();


      renderProducts(
        products.filter(
          product =>
            String(
              product.name || ""
            )
              .toLowerCase()
              .includes(keyword)
        )
      );

    };

  }


  const addButton =
    $("#addProduct");

  if (addButton) {
    addButton.onclick =
      () => productModal();
  }

}


function renderProducts(list) {

  const rows =
    $("#productRows");

  if (!rows) {
    return;
  }


  rows.innerHTML =
    list.length

      ? list
          .map(
            product => `

              <tr>

                <td>

                  <b>
                    ${escapeHTML(
                      product.name
                    )}
                  </b>

                  <br>

                  <span class="muted">
                    ${escapeHTML(
                      product.sku || ""
                    )}
                  </span>

                </td>


                <td>
                  ${escapeHTML(
                    product.categoryName || "-"
                  )}
                </td>


                <td>
                  ${money(
                    product.sellingPrice
                  )}
                </td>


                <td>
                  ${money(
                    product.costPrice
                  )}
                </td>


                <td>
                  ${normalizeNumber(
                    product.stock
                  )}

                  ${escapeHTML(
                    product.unit || ""
                  )}
                </td>


                <td>

                  <button
                    class="secondary-btn"
                    data-edit-product="${product.id}"
                  >
                    Edit
                  </button>


                  <button
                    class="danger-btn"
                    data-delete-product="${product.id}"
                  >
                    Hapus
                  </button>

                </td>

              </tr>

            `
          )
          .join("")

      : `

        <tr>

          <td
            colspan="6"
            class="empty"
          >
            Belum ada produk.
          </td>

        </tr>

      `;


  rows
    .querySelectorAll(
      "[data-edit-product]"
    )
    .forEach(button => {

      button.onclick = () =>
        productModal(
          products.find(
            product =>
              product.id ===
              button.dataset.editProduct
          )
        );

    });


  rows
    .querySelectorAll(
      "[data-delete-product]"
    )
    .forEach(button => {

      button.onclick = () =>
        removeProduct(
          button.dataset.deleteProduct
        );

    });

}


async function removeProduct(id) {

  const product =
    products.find(
      item => item.id === id
    );


  if (!product) {
    return;
  }


  const hasSales =
    sales.some(
      sale =>
        Array.isArray(sale.items) &&
        sale.items.some(
          item =>
            item.productId === id
        )
    );


  const hasPurchases =
    purchases.some(
      purchase =>
        purchase.productId === id
    );


  if (hasSales || hasPurchases) {

    const proceed =
      confirm(
        "Produk ini sudah memiliki riwayat transaksi/pembelian.\n\n" +
        "Menghapus produk tidak akan menghapus riwayat transaksi.\n\n" +
        "Lanjutkan?"
      );

    if (!proceed) {
      return;
    }

  } else {

    if (
      !confirm(
        `Hapus produk "${product.name}"?`
      )
    ) {
      return;
    }

  }


  try {

    await deleteDoc(
      doc(
        db,
        "products",
        id
      )
    );


    await loadAll();

    productsView();

    toast(
      "Produk berhasil dihapus."
    );


  } catch (error) {

    console.error(
      "Delete Product Error:",
      error
    );

    toast(
      "Gagal menghapus produk."
    );

  }

}


window.editProduct =
  id =>
    productModal(
      products.find(
        product =>
          product.id === id
      )
    );


window.removeProduct =
  removeProduct;


/* =========================================================
   PRODUCT MODAL
========================================================= */

function productModal(product = {}) {

  const isEdit =
    Boolean(product.id);


  const modalRoot =
    $("#modalRoot");

  if (!modalRoot) {
    return;
  }


  modalRoot.innerHTML = `

    <div class="modal">

      <div class="modal-box">

        <div class="modal-head">

          <h2>
            ${isEdit ? "Edit" : "Tambah"}
            Produk
          </h2>

          <button
            class="close"
            onclick="closeModal()"
          >
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
                value="${escapeHTML(
                  product.name || ""
                )}"
              >

            </div>


            <div class="form-group">

              <label>SKU</label>

              <input
                name="sku"
                value="${escapeHTML(
                  product.sku || ""
                )}"
              >

            </div>


            <div class="form-group">

              <label>Kategori</label>

              <input
                name="categoryName"
                value="${escapeHTML(
                  product.categoryName || ""
                )}"
                placeholder="Pop Ice / Jajanan"
              >

            </div>


            <div class="form-group">

              <label>Satuan</label>

              <input
                name="unit"
                value="${escapeHTML(
                  product.unit || "pcs"
                )}"
              >

            </div>


            <div class="form-group">

              <label>Harga Jual</label>

              <input
                name="sellingPrice"
                type="number"
                min="0"
                required
                value="${normalizeNumber(
                  product.sellingPrice
                )}"
              >

            </div>


            <div class="form-group">

              <label>Harga Modal</label>

              <input
                name="costPrice"
                type="number"
                min="0"
                value="${normalizeNumber(
                  product.costPrice
                )}"
              >

            </div>


            <div class="form-group">

              <label>Stok</label>

              <input
                name="stock"
                type="number"
                min="0"
                value="${normalizeNumber(
                  product.stock
                )}"
              >

            </div>


            <div class="form-group">

              <label>Minimum Stok</label>

              <input
                name="minimumStock"
                type="number"
                min="0"
                value="${product.minimumStock ?? 5}"
              >

            </div>

          </div>


          <div class="modal-actions">

            <button
              type="button"
              class="secondary-btn"
              onclick="closeModal()"
            >
              Batal
            </button>


            <button
              class="primary-btn"
            >
              Simpan
            </button>

          </div>

        </form>

      </div>

    </div>

  `;


  const form =
    $("#productForm");


  form.onsubmit =
    async event => {

      event.preventDefault();


      const data =
        new FormData(
          event.target
        );


      const name =
        String(
          data.get("name") || ""
        ).trim();


      const sellingPrice =
        normalizeNumber(
          data.get("sellingPrice")
        );


      const costPrice =
        normalizeNumber(
          data.get("costPrice")
        );


      const stock =
        normalizeNumber(
          data.get("stock")
        );


      const minimumStock =
        normalizeNumber(
          data.get("minimumStock")
        );


      if (!name) {
        return toast(
          "Nama produk wajib diisi."
        );
      }


      if (sellingPrice < 0) {
        return toast(
          "Harga jual tidak boleh negatif."
        );
      }


      if (costPrice < 0) {
        return toast(
          "Harga modal tidak boleh negatif."
        );
      }


      if (stock < 0) {
        return toast(
          "Stok tidak boleh negatif."
        );
      }


      try {

        const payload = {

          name,

          sku:
            String(
              data.get("sku") || ""
            ).trim(),

          categoryName:
            String(
              data.get("categoryName") || ""
            ).trim(),

          unit:
            String(
              data.get("unit") || "pcs"
            ).trim() ||
            "pcs",

          sellingPrice,

          costPrice,

          stock,

          minimumStock,

          updatedAt:
            serverTimestamp()

        };


        if (isEdit) {

          await updateDoc(
            doc(
              db,
              "products",
              product.id
            ),
            payload
          );

        } else {

          await addDoc(
            collection(
              db,
              "products"
            ),
            {
              ...payload,
              createdAt:
                serverTimestamp()
            }
          );

        }


        closeModal();

        await loadAll();

        productsView();

        toast(
          isEdit
            ? "Produk berhasil diperbarui."
            : "Produk berhasil ditambahkan."
        );


      } catch (error) {

        console.error(
          "Product Save Error:",
          error
        );

        toast(
          "Gagal menyimpan produk."
        );

      }

    };

}


/* =========================================================
   POS
========================================================= */

function posView() {

  const content =
    $("#pageContent");

  if (!content) {
    return;
  }


  content.innerHTML = `

    <div class="pos-grid">

      <div class="panel">

        <div class="toolbar">

          <input
            id="posSearch"
            placeholder="Cari produk..."
          >

        </div>


        <div
          id="posProducts"
          class="product-grid"
        ></div>

      </div>


      <div class="panel">

        <h2 class="section-title">
          Keranjang
        </h2>


        <div id="cartRows"></div>


        <div class="total-box">

          <span>Total</span>

          <span id="cartTotal">
            ${money(0)}
          </span>

        </div>


        <label>
          Metode Pembayaran
        </label>


        <select id="paymentMethod">

          <option value="Tunai">
            Tunai
          </option>

          <option value="QRIS">
            QRIS
          </option>

          <option value="Transfer">
            Transfer
          </option>

          <option value="E-Wallet">
            E-Wallet
          </option>

        </select>


        <button
          id="checkout"
          class="primary-btn full"
          style="margin-top:15px"
        >
          Bayar
        </button>

      </div>

    </div>

  `;


  renderPosProducts(products);

  renderCart();


  const search =
    $("#posSearch");

  if (search) {

    search.oninput = event => {

      const keyword =
        event.target.value
          .trim()
          .toLowerCase();


      renderPosProducts(
        products.filter(
          product =>
            String(
              product.name || ""
            )
              .toLowerCase()
              .includes(keyword)
        )
      );

    };

  }


  const checkoutButton =
    $("#checkout");

  if (checkoutButton) {
    checkoutButton.onclick =
      checkout;
  }

}


function renderPosProducts(list) {

  const container =
    $("#posProducts");

  if (!container) {
    return;
  }


  container.innerHTML =
    list.length

      ? list
          .map(
            product => {

              const stock =
                normalizeNumber(
                  product.stock
                );


              return `

                <div class="product-card">

                  <h3>
                    ${escapeHTML(
                      product.name
                    )}
                  </h3>

                  <div>
                    ${money(
                      product.sellingPrice
                    )}
                  </div>

                  <small class="muted">
                    Stok:
                    ${stock}
                    ${escapeHTML(
                      product.unit || "pcs"
                    )}
                  </small>


                  <button
                    class="primary-btn"
                    data-add-cart="${product.id}"
                    ${stock <= 0 ? "disabled" : ""}
                  >
                    ${
                      stock <= 0
                        ? "Stok Habis"
                        : "Tambah"
                    }
                  </button>

                </div>

              `;

            }
          )
          .join("")

      : `

        <div class="empty">
          Produk tidak ditemukan.
        </div>

      `;


  container
    .querySelectorAll(
      "[data-add-cart]"
    )
    .forEach(button => {

      button.onclick = () =>
        addCart(
          button.dataset.addCart
        );

    });

}


function addCart(id) {

  const product =
    products.find(
      item => item.id === id
    );


  if (!product) {
    return toast(
      "Produk tidak ditemukan."
    );
  }


  const stock =
    normalizeNumber(
      product.stock
    );


  if (stock <= 0) {
    return toast(
      "Stok habis."
    );
  }


  const existing =
    cart.find(
      item => item.id === id
    );


  if (existing) {

    if (
      existing.qty >= stock
    ) {

      return toast(
        "Jumlah melebihi stok."
      );

    }


    existing.qty++;

  } else {

    cart.push({

      id: product.id,

      name: product.name,

      price:
        normalizeNumber(
          product.sellingPrice
        ),

      qty: 1

    });

  }


  renderCart();

}


window.addCart =
  addCart;


function changeQty(id, delta) {

  const item =
    cart.find(
      entry => entry.id === id
    );


  if (!item) {
    return;
  }


  const product =
    products.find(
      entry => entry.id === id
    );


  const maxStock =
    normalizeNumber(
      product?.stock
    );


  item.qty += delta;


  if (item.qty <= 0) {

    cart =
      cart.filter(
        entry => entry.id !== id
      );

  } else if (
    item.qty > maxStock
  ) {

    item.qty = maxStock;

    toast(
      "Jumlah tidak boleh melebihi stok."
    );

  }


  renderCart();

}


window.changeQty =
  changeQty;


function removeCartItem(id) {

  cart =
    cart.filter(
      item => item.id !== id
    );


  renderCart();

}


function renderCart() {

  const container =
    $("#cartRows");

  if (!container) {
    return;
  }


  container.innerHTML =
    cart.length

      ? cart
          .map(
            item => `

              <div class="cart-row">

                <div>

                  ${escapeHTML(
                    item.name
                  )}

                  <br>

                  <span class="muted">

                    ${money(
                      item.price
                    )}

                    ×
                    ${item.qty}

                  </span>

                </div>


                <div class="qty">

                  <button
                    data-cart-minus="${item.id}"
                  >
                    −
                  </button>

                  <b>
                    ${item.qty}
                  </b>

                  <button
                    data-cart-plus="${item.id}"
                  >
                    +
                  </button>

                </div>


                <div>

                  <b>
                    ${money(
                      item.price *
                      item.qty
                    )}
                  </b>

                  <br>

                  <button
                    class="danger-btn"
                    data-cart-remove="${item.id}"
                  >
                    Hapus
                  </button>

                </div>

              </div>

            `
          )
          .join("")

      : `

        <div class="empty">
          Keranjang kosong.
        </div>

      `;


  container
    .querySelectorAll(
      "[data-cart-minus]"
    )
    .forEach(button => {

      button.onclick = () =>
        changeQty(
          button.dataset.cartMinus,
          -1
        );

    });


  container
    .querySelectorAll(
      "[data-cart-plus]"
    )
    .forEach(button => {

      button.onclick = () =>
        changeQty(
          button.dataset.cartPlus,
          1
        );

    });


  container
    .querySelectorAll(
      "[data-cart-remove]"
    )
    .forEach(button => {

      button.onclick = () =>
        removeCartItem(
          button.dataset.cartRemove
        );

    });


  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        item.price *
        item.qty,
      0
    );


  const totalElement =
    $("#cartTotal");

  if (totalElement) {
    totalElement.textContent =
      money(total);
  }

}


/* =========================================================
   CHECKOUT
========================================================= */

async function checkout() {

  if (!cart.length) {

    return toast(
      "Keranjang kosong."
    );

  }


  const paymentElement =
    $("#paymentMethod");


  const paymentMethod =
    paymentElement?.value ||
    "Tunai";


  const invoice =
    "TRX-" +
    Date.now();


  const cartSnapshot =
    cart.map(
      item => ({
        id: item.id,
        qty: item.qty
      })
    );


  try {

    await runTransaction(
      db,
      async transaction => {

        const productRefs =
          cartSnapshot.map(
            item =>
              doc(
                db,
                "products",
                item.id
              )
          );


        const productSnapshots =
          [];


        for (
          const productRef
          of productRefs
        ) {

          const snapshot =
            await transaction.get(
              productRef
            );

          productSnapshots.push(
            snapshot
          );

        }


        const items = [];

        let total = 0;


        for (
          let index = 0;
          index < cartSnapshot.length;
          index++
        ) {

          const cartItem =
            cartSnapshot[index];


          const snapshot =
            productSnapshots[index];


          if (!snapshot.exists()) {

            throw new Error(
              "Produk tidak ditemukan."
            );

          }


          const product =
            snapshot.data();


          const currentStock =
            normalizeNumber(
              product.stock
            );


          if (
            cartItem.qty <= 0 ||
            cartItem.qty > currentStock
          ) {

            throw new Error(
              `Stok ${product.name} tidak mencukupi.`
            );

          }


          const sellingPrice =
            normalizeNumber(
              product.sellingPrice
            );


          const costPrice =
            normalizeNumber(
              product.costPrice
            );


          total +=
            sellingPrice *
            cartItem.qty;


          items.push({

            productId:
              cartItem.id,

            name:
              product.name,

            qty:
              cartItem.qty,

            price:
              sellingPrice,

            costPrice

          });


          transaction.update(
            productRefs[index],
            {

              stock:
                currentStock -
                cartItem.qty,

              updatedAt:
                serverTimestamp()

            }
          );

        }


        const saleRef =
          doc(
            collection(
              db,
              "sales"
            )
          );


        transaction.set(
          saleRef,
          {

            invoice,

            date:
              todayISO(),

            total,

            paymentMethod,

            items,

            createdAt:
              serverTimestamp()

          }
        );


        for (
          const item
          of items
        ) {

          const movementRef =
            doc(
              collection(
                db,
                "stock_movements"
              )
            );


          transaction.set(
            movementRef,
            {

              productId:
                item.productId,

              type:
                "SALE",

              qty:
                -item.qty,

              reference:
                invoice,

              date:
                todayISO(),

              createdAt:
                serverTimestamp()

            }
          );

        }

      }
    );


    cart = [];


    await loadAll();

    posView();


    toast(
      `Transaksi berhasil: ${invoice}`
    );


  } catch (error) {

    console.error(
      "Checkout Error:",
      error
    );


    toast(
      error.message ||
      "Gagal melakukan transaksi."
    );

  }

}


/* =========================================================
   INVENTORY
========================================================= */

function inventoryView() {

  const sorted =
    [...products].sort(
      (a, b) =>
        normalizeNumber(a.stock) -
        normalizeNumber(b.stock)
    );


  const content =
    $("#pageContent");

  if (!content) {
    return;
  }


  content.innerHTML = `

    <div class="panel">

      <div class="toolbar">

        <h2 class="section-title">
          Persediaan
        </h2>


        <button
          id="stockIn"
          class="primary-btn"
        >
          + Stok Masuk
        </button>

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
              sorted.length
                ? sorted
                    .map(
                      product => {

                        const stock =
                          normalizeNumber(
                            product.stock
                          );


                        const minimum =
                          normalizeNumber(
                            product.minimumStock ??
                            5
                          );


                        return `

                          <tr>

                            <td>
                              ${escapeHTML(
                                product.name
                              )}
                            </td>

                            <td>

                              <b>
                                ${stock}
                              </b>

                              ${escapeHTML(
                                product.unit ||
                                ""
                              )}

                            </td>

                            <td>
                              ${minimum}
                            </td>

                            <td>

                              ${
                                stock <= minimum
                                  ? `
                                    <span class="badge low">
                                      Menipis
                                    </span>
                                  `
                                  : `
                                    <span class="badge">
                                      Aman
                                    </span>
                                  `
                              }

                            </td>

                          </tr>

                        `;

                      }
                    )
                    .join("")
                : `

                    <tr>

                      <td
                        colspan="4"
                        class="empty"
                      >
                        Belum ada produk.
                      </td>

                    </tr>

                  `
            }

          </tbody>

        </table>

      </div>

    </div>

  `;


  const stockButton =
    $("#stockIn");

  if (stockButton) {
    stockButton.onclick =
      stockModal;
  }

}


/* =========================================================
   STOCK MODAL
========================================================= */

function stockModal() {

  if (!products.length) {

    return toast(
      "Tambahkan produk terlebih dahulu."
    );

  }


  const modalRoot =
    $("#modalRoot");

  if (!modalRoot) {
    return;
  }


  modalRoot.innerHTML = `

    <div class="modal">

      <div class="modal-box">

        <div class="modal-head">

          <h2>
            Stok Masuk
          </h2>


          <button
            class="close"
            onclick="closeModal()"
          >
            ✕
          </button>

        </div>


        <form id="stockForm">

          <div class="form-group">

            <label>
              Produk
            </label>


            <select name="product">

              ${
                products
                  .map(
                    product => `

                      <option
                        value="${product.id}"
                      >

                        ${escapeHTML(
                          product.name
                        )}

                        (stok
                        ${normalizeNumber(
                          product.stock
                        )})

                      </option>

                    `
                  )
                  .join("")
              }

            </select>

          </div>


          <div class="form-group">

            <label>
              Jumlah
            </label>

            <input
              name="qty"
              type="number"
              min="1"
              step="1"
              required
            >

          </div>


          <div class="form-group">

            <label>
              Keterangan
            </label>

            <input
              name="note"
              placeholder="Contoh: Stok dari supplier"
            >

          </div>


          <div class="modal-actions">

            <button
              type="button"
              class="secondary-btn"
              onclick="closeModal()"
            >
              Batal
            </button>


            <button
              class="primary-btn"
            >
              Simpan
            </button>

          </div>

        </form>

      </div>

    </div>

  `;


  const form =
    $("#stockForm");


  form.onsubmit =
    async event => {

      event.preventDefault();


      const data =
        new FormData(
          event.target
        );


      const productId =
        data.get("product");


      const qty =
        normalizeNumber(
          data.get("qty")
        );


      const product =
        products.find(
          item =>
            item.id === productId
        );


      if (!product) {
        return toast(
          "Produk tidak ditemukan."
        );
      }


      if (qty <= 0) {
        return toast(
          "Jumlah stok harus lebih dari 0."
        );
      }


      try {

        await runTransaction(
          db,
          async transaction => {

            const productRef =
              doc(
                db,
                "products",
                productId
              );


            const snapshot =
              await transaction.get(
                productRef
              );


            if (!snapshot.exists()) {
              throw new Error(
                "Produk tidak ditemukan."
              );
            }


            const current =
              snapshot.data();


            const currentStock =
              normalizeNumber(
                current.stock
              );


            transaction.update(
              productRef,
              {

                stock:
                  currentStock +
                  qty,

                updatedAt:
                  serverTimestamp()

              }
            );


            const movementRef =
              doc(
                collection(
                  db,
                  "stock_movements"
                )
              );


            transaction.set(
              movementRef,
              {

                productId,

                type:
                  "PURCHASE",

                qty,

                reference:
                  String(
                    data.get("note") ||
                    "Stok masuk"
                  ).trim(),

                date:
                  todayISO(),

                createdAt:
                  serverTimestamp()

              }
            );

          }
        );


        closeModal();

        await loadAll();

        inventoryView();

        toast(
          "Stok berhasil ditambahkan."
        );


      } catch (error) {

        console.error(
          "Stock In Error:",
          error
        );

        toast(
          error.message ||
          "Gagal menambah stok."
        );

      }

    };

}


/* =========================================================
   PURCHASES
========================================================= */

function purchasesView() {

  const content =
    $("#pageContent");

  if (!content) {
    return;
  }


  content.innerHTML = `

    <div class="panel">

      <div class="toolbar">

        <div>

          <h2 class="section-title">
            Pembelian / Supplier
          </h2>

          <div class="muted">
            Kelola pembelian barang dari supplier
          </div>

        </div>


        <button
          id="purchaseBtn"
          class="primary-btn"
        >
          + Catat Pembelian
        </button>

      </div>


      <div class="table-wrap">

        <table>

          <thead>

            <tr>

              <th>Supplier</th>
              <th>Tanggal</th>
              <th>Produk</th>
              <th>Jumlah</th>
              <th>Harga Modal</th>
              <th>Total</th>
              <th>Aksi</th>

            </tr>

          </thead>


          <tbody id="purchaseRows"></tbody>

        </table>

      </div>

    </div>

  `;


  renderPurchases();


  const button =
    $("#purchaseBtn");

  if (button) {
    button.onclick =
      () => purchaseModal();
  }

}


function renderPurchases() {

  const rows =
    $("#purchaseRows");

  if (!rows) {
    return;
  }


  rows.innerHTML =
    purchases.length

      ? purchases
          .map(
            purchase => `

              <tr>

                <td>
                  <b>
                    ${escapeHTML(
                      purchase.supplierName ||
                      "-"
                    )}
                  </b>
                </td>


                <td>
                  ${dateText(
                    purchase.date
                  )}
                </td>


                <td>
                  ${escapeHTML(
                    purchase.productName ||
                    getProductName(
                      purchase.productId
                    )
                  )}
                </td>


                <td>

                  <b>
                    ${normalizeNumber(
                      purchase.qty
                    )}
                  </b>

                  ${escapeHTML(
                    getProductUnit(
                      purchase.productId
                    )
                  )}

                </td>


                <td>
                  ${money(
                    purchase.cost
                  )}
                </td>


                <td>
                  <b>
                    ${money(
                      purchase.total
                    )}
                  </b>
                </td>


                <td>

                  <button
                    class="secondary-btn"
                    data-edit-purchase="${purchase.id}"
                  >
                    Edit
                  </button>


                  <button
                    class="danger-btn"
                    data-delete-purchase="${purchase.id}"
                  >
                    Hapus
                  </button>

                </td>

              </tr>

            `
          )
          .join("")

      : `

        <tr>

          <td
            colspan="7"
            class="empty"
          >
            Belum ada pembelian.
          </td>

        </tr>

      `;


  rows
    .querySelectorAll(
      "[data-edit-purchase]"
    )
    .forEach(button => {

      button.onclick = () =>
        purchaseModal(
          purchases.find(
            purchase =>
              purchase.id ===
              button.dataset.editPurchase
          )
        );

    });


  rows
    .querySelectorAll(
      "[data-delete-purchase]"
    )
    .forEach(button => {

      button.onclick = () =>
        removePurchase(
          button.dataset.deletePurchase
        );

    });

}


window.editPurchase =
  id =>
    purchaseModal(
      purchases.find(
        purchase =>
          purchase.id === id
      )
    );


window.removePurchase =
  removePurchase;


/* =========================================================
   DELETE PURCHASE
========================================================= */

async function removePurchase(id) {

  const purchase =
    purchases.find(
      item => item.id === id
    );


  if (!purchase) {

    return toast(
      "Data pembelian tidak ditemukan."
    );

  }


  const confirmed =
    confirm(
      "Hapus pembelian ini?\n\n" +
      `Supplier: ${
        purchase.supplierName || "-"
      }\n` +
      `Produk: ${
        purchase.productName || "-"
      }\n` +
      `Jumlah: ${
        purchase.qty || 0
      }\n` +
      `Total: ${
        money(purchase.total)
      }\n\n` +
      "Stok akan dikurangi kembali."
    );


  if (!confirmed) {
    return;
  }


  try {

    await runTransaction(
      db,
      async transaction => {

        const purchaseRef =
          doc(
            db,
            "purchases",
            id
          );


        const purchaseSnapshot =
          await transaction.get(
            purchaseRef
          );


        if (!purchaseSnapshot.exists()) {
          throw new Error(
            "Pembelian tidak ditemukan."
          );
        }


        const currentPurchase =
          purchaseSnapshot.data();


        const productId =
          currentPurchase.productId;


        const qty =
          normalizeNumber(
            currentPurchase.qty
          );


        const productRef =
          doc(
            db,
            "products",
            productId
          );


        const productSnapshot =
          await transaction.get(
            productRef
          );


        if (
          productSnapshot.exists()
        ) {

          const product =
            productSnapshot.data();


          const currentStock =
            normalizeNumber(
              product.stock
            );


          const newStock =
            Math.max(
              0,
              currentStock - qty
            );


          transaction.update(
            productRef,
            {

              stock:
                newStock,

              updatedAt:
                serverTimestamp()

            }
          );

        }


        transaction.delete(
          purchaseRef
        );


        if (
          currentPurchase.stockMovementId
        ) {

          transaction.delete(
            doc(
              db,
              "stock_movements",
              currentPurchase.stockMovementId
            )
          );

        }

      }
    );


    await loadAll();

    purchasesView();

    toast(
      "Pembelian berhasil dihapus."
    );


  } catch (error) {

    console.error(
      "Delete Purchase Error:",
      error
    );

    toast(
      error.message ||
      "Gagal menghapus pembelian."
    );

  }

}


/* =========================================================
   PURCHASE MODAL
========================================================= */

function purchaseModal(
  purchase = null
) {

  const isEdit =
    Boolean(
      purchase?.id
    );


  if (
    !isEdit &&
    !products.length
  ) {

    return toast(
      "Tambahkan produk terlebih dahulu."
    );

  }


  const selectedProductId =
    purchase?.productId ||
    products[0]?.id ||
    "";


  const modalRoot =
    $("#modalRoot");

  if (!modalRoot) {
    return;
  }


  modalRoot.innerHTML = `

    <div class="modal">

      <div class="modal-box">

        <div class="modal-head">

          <h2>
            ${
              isEdit
                ? "Edit Pembelian"
                : "Catat Pembelian"
            }
          </h2>


          <button
            class="close"
            onclick="closeModal()"
          >
            ✕
          </button>

        </div>


        <form id="purchaseForm">

          <div class="form-grid">

            <div class="form-group">

              <label>
                Supplier
              </label>

              <input
                name="supplierName"
                required
                placeholder="Nama supplier"
                value="${escapeHTML(
                  purchase?.supplierName ||
                  ""
                )}"
              >

            </div>


            <div class="form-group">

              <label>
                Tanggal
              </label>

              <input
                name="date"
                type="date"
                value="${
                  purchase?.date ||
                  todayISO()
                }"
                required
              >

            </div>


            <div class="form-group">

              <label>
                Produk
              </label>

              <select
                name="productId"
                required
              >

                ${
                  products
                    .map(
                      product => `

                        <option
                          value="${product.id}"
                          ${
                            product.id ===
                            selectedProductId
                              ? "selected"
                              : ""
                          }
                        >

                          ${escapeHTML(
                            product.name
                          )}

                        </option>

                      `
                    )
                    .join("")
                }

              </select>

            </div>


            <div class="form-group">

              <label>
                Jumlah
              </label>

              <input
                name="qty"
                type="number"
                min="1"
                step="1"
                required
                value="${
                  purchase?.qty || ""
                }"
              >

            </div>


            <div class="form-group">

              <label>
                Harga Modal / Unit
              </label>

              <input
                name="cost"
                type="number"
                min="0"
                step="1"
                required
                value="${
                  purchase?.cost ?? ""
                }"
              >

            </div>

          </div>


          <div
            class="total-box"
            style="margin-top:18px"
          >

            <span>
              Total Pembelian
            </span>

            <strong id="purchaseTotal">
              ${money(
                normalizeNumber(
                  purchase?.qty
                ) *
                normalizeNumber(
                  purchase?.cost
                )
              )}
            </strong>

          </div>


          <div class="modal-actions">

            <button
              type="button"
              class="secondary-btn"
              onclick="closeModal()"
            >
              Batal
            </button>


            <button
              class="primary-btn"
            >

              ${
                isEdit
                  ? "Simpan Perubahan"
                  : "Simpan Pembelian"
              }

            </button>

          </div>

        </form>

      </div>

    </div>

  `;


  const form =
    $("#purchaseForm");


  const qtyInput =
    form.querySelector(
      '[name="qty"]'
    );


  const costInput =
    form.querySelector(
      '[name="cost"]'
    );


  const totalElement =
    $("#purchaseTotal");


  function updatePurchaseTotal() {

    const qty =
      normalizeNumber(
        qtyInput.value
      );


    const cost =
      normalizeNumber(
        costInput.value
      );


    totalElement.textContent =
      money(
        qty * cost
      );

  }


  qtyInput.oninput =
    updatePurchaseTotal;


  costInput.oninput =
    updatePurchaseTotal;


  form.onsubmit =
    async event => {

      event.preventDefault();


      const data =
        new FormData(
          event.target
        );


      const supplierName =
        String(
          data.get(
            "supplierName"
          ) || ""
        ).trim();


      const date =
        String(
          data.get("date") || ""
        );


      const productId =
        String(
          data.get("productId") || ""
        );


      const qty =
        normalizeNumber(
          data.get("qty")
        );


      const cost =
        normalizeNumber(
          data.get("cost")
        );


      if (!supplierName) {

        return toast(
          "Nama supplier wajib diisi."
        );

      }


      if (!date) {

        return toast(
          "Tanggal pembelian wajib diisi."
        );

      }


      if (!productId) {

        return toast(
          "Pilih produk terlebih dahulu."
        );

      }


      if (qty <= 0) {

        return toast(
          "Jumlah pembelian harus lebih dari 0."
        );

      }


      if (cost < 0) {

        return toast(
          "Harga modal tidak boleh negatif."
        );

      }


      const newProduct =
        products.find(
          product =>
            product.id === productId
        );


      if (!newProduct) {

        return toast(
          "Produk tidak ditemukan."
        );

      }


      const total =
        qty * cost;


      try {

        await runTransaction(
          db,
          async transaction => {

            const purchaseRef =
              isEdit
                ? doc(
                    db,
                    "purchases",
                    purchase.id
                  )
                : doc(
                    collection(
                      db,
                      "purchases"
                    )
                  );


            const oldPurchase =
              isEdit
                ? await transaction.get(
                    purchaseRef
                  )
                : null;


            if (
              isEdit &&
              !oldPurchase.exists()
            ) {

              throw new Error(
                "Data pembelian tidak ditemukan."
              );

            }


            let oldProductSnapshot =
              null;


            if (isEdit) {

              oldProductSnapshot =
                await transaction.get(
                  doc(
                    db,
                    "products",
                    purchase.productId
                  )
                );

            }


            const newProductRef =
              doc(
                db,
                "products",
                productId
              );


            const newProductSnapshot =
              await transaction.get(
                newProductRef
              );


            if (
              !newProductSnapshot.exists()
            ) {

              throw new Error(
                "Produk baru tidak ditemukan."
              );

            }


            /*
             * =================================================
             * EDIT PEMBELIAN
             * =================================================
             */

            if (isEdit) {

              const oldQty =
                normalizeNumber(
                  purchase.qty
                );


              const oldProductId =
                purchase.productId;


              /*
               * PRODUK SAMA
               */

              if (
                oldProductId ===
                productId
              ) {

                const currentStock =
                  normalizeNumber(
                    newProductSnapshot.data()
                      .stock
                  );


                const newStock =
                  currentStock -
                  oldQty +
                  qty;


                if (newStock < 0) {

                  throw new Error(
                    "Stok tidak cukup untuk mengubah pembelian ini."
                  );

                }


                transaction.update(
                  newProductRef,
                  {

                    stock:
                      newStock,

                    costPrice:
                      cost,

                    updatedAt:
                      serverTimestamp()

                  }
                );

              }


              /*
               * PRODUK BERUBAH
               */

              else {

                if (
                  oldProductSnapshot?.exists()
                ) {

                  const oldProduct =
                    oldProductSnapshot.data();


                  const oldStock =
                    normalizeNumber(
                      oldProduct.stock
                    );


                  const restoredStock =
                    oldStock -
                    oldQty;


                  if (
                    restoredStock < 0
                  ) {

                    throw new Error(
                      "Stok produk lama tidak mencukupi untuk membatalkan pembelian."
                    );

                  }


                  transaction.update(
                    doc(
                      db,
                      "products",
                      oldProductId
                    ),
                    {

                      stock:
                        restoredStock,

                      updatedAt:
                        serverTimestamp()

                    }
                  );

                }


                const newCurrentStock =
                  normalizeNumber(
                    newProductSnapshot
                      .data()
                      .stock
                  );


                transaction.update(
                  newProductRef,
                  {

                    stock:
                      newCurrentStock +
                      qty,

                    costPrice:
                      cost,

                    updatedAt:
                      serverTimestamp()

                  }
                );

              }


              /*
               * UPDATE PURCHASE
               */

              transaction.update(
                purchaseRef,
                {

                  supplierName,

                  date,

                  productId,

                  productName:
                    newProductSnapshot
                      .data()
                      .name,

                  qty,

                  cost,

                  total,

                  updatedAt:
                    serverTimestamp()

                }
              );


              /*
               * UPDATE STOCK MOVEMENT
               */

              if (
                purchase.stockMovementId
              ) {

                transaction.update(
                  doc(
                    db,
                    "stock_movements",
                    purchase.stockMovementId
                  ),
                  {

                    productId,

                    type:
                      "PURCHASE",

                    qty,

                    reference:
                      "Pembelian " +
                      purchase.id,

                    purchaseId:
                      purchase.id,

                    date,

                    updatedAt:
                      serverTimestamp()

                  }
                );

              } else {

                const movementRef =
                  doc(
                    collection(
                      db,
                      "stock_movements"
                    )
                  );


                transaction.set(
                  movementRef,
                  {

                    productId,

                    type:
                      "PURCHASE",

                    qty,

                    reference:
                      "Pembelian " +
                      purchase.id,

                    purchaseId:
                      purchase.id,

                    date,

                    createdAt:
                      serverTimestamp()

                  }
                );


                transaction.update(
                  purchaseRef,
                  {

                    stockMovementId:
                      movementRef.id

                  }
                );

              }


              return;

            }


            /*
             * =================================================
             * TAMBAH PEMBELIAN BARU
             * =================================================
             */

            const currentStock =
              normalizeNumber(
                newProductSnapshot
                  .data()
                  .stock
              );


            transaction.update(
              newProductRef,
              {

                stock:
                  currentStock +
                  qty,

                costPrice:
                  cost,

                updatedAt:
                  serverTimestamp()

              }
            );


            transaction.set(
              purchaseRef,
              {

                supplierName,

                date,

                productId,

                productName:
                  newProductSnapshot
                    .data()
                    .name,

                qty,

                cost,

                total,

                createdAt:
                  serverTimestamp()

              }
            );


            const movementRef =
              doc(
                collection(
                  db,
                  "stock_movements"
                )
              );


            transaction.set(
              movementRef,
              {

                productId,

                type:
                  "PURCHASE",

                qty,

                reference:
                  "Pembelian " +
                  purchaseRef.id,

                purchaseId:
                  purchaseRef.id,

                date,

                createdAt:
                  serverTimestamp()

              }
            );


            transaction.update(
              purchaseRef,
              {

                stockMovementId:
                  movementRef.id

              }
            );

          }
        );


        closeModal();

        await loadAll();

        purchasesView();


        toast(
          isEdit
            ? "Pembelian berhasil diperbarui."
            : "Pembelian berhasil disimpan."
        );


      } catch (error) {

        console.error(
          "Purchase Save Error:",
          error
        );

        toast(
          error.message ||
          "Gagal menyimpan pembelian."
        );

      }

    };

}


/* =========================================================
   FINANCE
========================================================= */

function financeView() {

  const revenue =
    sales.reduce(
      (total, sale) =>
        total +
        normalizeNumber(
          sale.total
        ),
      0
    );


  const expense =
    expenses.reduce(
      (total, item) =>
        total +
        normalizeNumber(
          item.amount
        ),
      0
    );


  const content =
    $("#pageContent");

  if (!content) {
    return;
  }


  const sortedExpenses =
    expenses
      .slice()
      .sort(
        (a, b) =>
          String(b.date || "").localeCompare(
            String(a.date || "")
          )
      );


  content.innerHTML = `

    <div class="grid cards">

      <div class="card">

        <div class="stat-label">
          Total Penjualan
        </div>

        <div class="stat-value">
          ${money(revenue)}
        </div>

      </div>


      <div class="card">

        <div class="stat-label">
          Total Pengeluaran
        </div>

        <div class="stat-value">
          ${money(expense)}
        </div>

      </div>


      <div class="card">

        <div class="stat-label">
          Selisih Kas
        </div>

        <div class="stat-value">
          ${money(
            revenue - expense
          )}
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
      style="margin-top:18px"
    >

      <div class="toolbar">

        <h2 class="section-title">
          Pengeluaran
        </h2>


        <button
          id="expenseBtn"
          class="primary-btn"
          type="button"
        >
          + Pengeluaran
        </button>

      </div>


      <div class="table-wrap">

        <table>

          <thead>

            <tr>

              <th>Tanggal</th>

              <th>Kategori</th>

              <th>Keterangan</th>

              <th>Jumlah</th>

              <th>Aksi</th>

            </tr>

          </thead>


          <tbody>

            ${
              sortedExpenses.length

                ? sortedExpenses
                    .map(
                      item => `

                        <tr>

                          <td>
                            ${dateText(
                              item.date
                            )}
                          </td>


                          <td>
                            ${escapeHTML(
                              item.category ||
                              "-"
                            )}
                          </td>


                          <td>
                            ${escapeHTML(
                              item.description ||
                              "-"
                            )}
                          </td>


                          <td>
                            ${money(
                              item.amount
                            )}
                          </td>


                          <td>

                            <div
                              style="
                                display:flex;
                                gap:8px;
                                align-items:center;
                                white-space:nowrap;
                              "
                            >

                              <button
                                type="button"
                                data-edit-expense="${escapeHTML(
                                  item.id
                                )}"
                                style="
                                  border:0;
                                  border-radius:8px;
                                  padding:7px 12px;
                                  cursor:pointer;
                                  background:#eef2ff;
                                  color:#4338ca;
                                  font-weight:600;
                                "
                              >
                                Edit
                              </button>


                              <button
                                type="button"
                                data-delete-expense="${escapeHTML(
                                  item.id
                                )}"
                                style="
                                  border:0;
                                  border-radius:8px;
                                  padding:7px 12px;
                                  cursor:pointer;
                                  background:#fee2e2;
                                  color:#dc2626;
                                  font-weight:600;
                                "
                              >
                                Hapus
                              </button>

                            </div>

                          </td>

                        </tr>

                      `
                    )
                    .join("")

                : `

                    <tr>

                      <td
                        colspan="5"
                        class="empty"
                      >
                        Belum ada pengeluaran.
                      </td>

                    </tr>

                  `
            }

          </tbody>

        </table>

      </div>

    </div>

  `;


  /* =====================================================
     TOMBOL TAMBAH
  ===================================================== */

  const expenseButton =
    $("#expenseBtn");


  if (expenseButton) {

    expenseButton.onclick =
      () => {

        expenseModal();

      };

  }


  /* =====================================================
     TOMBOL EDIT
  ===================================================== */

  content
    .querySelectorAll(
      "[data-edit-expense]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.editExpense;


            const expense =
              expenses.find(
                item =>
                  item.id === id
              );


            if (!expense) {

              toast(
                "Data pengeluaran tidak ditemukan."
              );

              return;

            }


            expenseModal(
              expense
            );

          }
        );

      }
    );


  /* =====================================================
     TOMBOL HAPUS
  ===================================================== */

  content
    .querySelectorAll(
      "[data-delete-expense]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            removeExpense(
              button.dataset.deleteExpense
            );

          }
        );

      }
    );

}


/* =========================================================
   EXPENSE MODAL
========================================================= */

function expenseModal(
  expense = null
) {

  const isEdit =
    Boolean(
      expense &&
      expense.id
    );


  const modalRoot =
    $("#modalRoot");


  if (!modalRoot) {

    toast(
      "Modal tidak ditemukan."
    );

    return;

  }


  modalRoot.innerHTML = `

    <div class="modal">

      <div class="modal-box">

        <div class="modal-head">

          <h2>

            ${
              isEdit
                ? "Edit Pengeluaran"
                : "Tambah Pengeluaran"
            }

          </h2>


          <button
            class="close"
            type="button"
            onclick="closeModal()"
          >
            ✕
          </button>

        </div>


        <form id="expenseForm">

          <div class="form-grid">


            <div class="form-group">

              <label>
                Tanggal
              </label>


              <input
                name="date"
                type="date"
                required
                value="${
                  escapeHTML(
                    expense?.date ||
                    todayISO()
                  )
                }"
              >

            </div>


            <div class="form-group">

              <label>
                Kategori
              </label>


              <input
                name="category"
                type="text"
                required
                value="${
                  escapeHTML(
                    expense?.category ||
                    ""
                  )
                }"
                placeholder="Contoh: minyak"
              >

            </div>


            <div class="form-group">

              <label>
                Jumlah
              </label>


              <input
                name="amount"
                type="number"
                min="1"
                step="1"
                required
                value="${
                  expense
                    ? normalizeNumber(
                        expense.amount
                      )
                    : ""
                }"
                placeholder="18000"
              >

            </div>


            <div class="form-group">

              <label>
                Keterangan
              </label>


              <input
                name="description"
                type="text"
                value="${
                  escapeHTML(
                    expense?.description ||
                    ""
                  )
                }"
                placeholder="Contoh: 1 kg"
              >

            </div>

          </div>


          <div class="modal-actions">


            <button
              type="button"
              class="secondary-btn"
              onclick="closeModal()"
            >
              Batal
            </button>


            <button
              type="submit"
              class="primary-btn"
            >

              ${
                isEdit
                  ? "Simpan Perubahan"
                  : "Simpan"
              }

            </button>


          </div>

        </form>

      </div>

    </div>

  `;


  const form =
    $("#expenseForm");


  if (!form) {
    return;
  }


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const formData =
        new FormData(
          form
        );


      const date =
        String(
          formData.get(
            "date"
          ) || ""
        );


      const category =
        String(
          formData.get(
            "category"
          ) || ""
        ).trim();


      const amount =
        normalizeNumber(
          formData.get(
            "amount"
          )
        );


      const description =
        String(
          formData.get(
            "description"
          ) || ""
        ).trim();


      /* ===================================================
         VALIDASI
      =================================================== */

      if (!date) {

        toast(
          "Tanggal wajib diisi."
        );

        return;

      }


      if (!category) {

        toast(
          "Kategori wajib diisi."
        );

        return;

      }


      if (amount <= 0) {

        toast(
          "Jumlah harus lebih dari 0."
        );

        return;

      }


      try {


        /* =================================================
           EDIT
        ================================================= */

        if (isEdit) {

          await updateDoc(

            doc(
              db,
              "expenses",
              expense.id
            ),

            {

              date:
                date,

              category:
                category,

              amount:
                amount,

              description:
                description,

              updatedAt:
                serverTimestamp()

            }

          );


          closeModal();


          await loadAll();


          financeView();


          toast(
            "Pengeluaran berhasil diperbarui."
          );


          return;

        }


        /* =================================================
           TAMBAH
        ================================================= */

        await addDoc(

          collection(
            db,
            "expenses"
          ),

          {

            date:
              date,

            category:
              category,

            amount:
              amount,

            description:
              description,

            createdAt:
              serverTimestamp()

          }

        );


        closeModal();


        await loadAll();


        financeView();


        toast(
          "Pengeluaran berhasil ditambahkan."
        );


      } catch (error) {

        console.error(
          "Expense Save Error:",
          error
        );


        toast(
          error.message ||
          "Gagal menyimpan pengeluaran."
        );

      }

    }
  );

}


/* =========================================================
   REMOVE EXPENSE
========================================================= */

async function removeExpense(
  id
) {

  const expense =
    expenses.find(
      item =>
        item.id === id
    );


  if (!expense) {

    toast(
      "Data pengeluaran tidak ditemukan."
    );

    return;

  }


  const message =
    "Hapus pengeluaran ini?\n\n" +

    "Tanggal: " +
    dateText(
      expense.date
    ) +

    "\nKategori: " +
    (
      expense.category ||
      "-"
    ) +

    "\nKeterangan: " +
    (
      expense.description ||
      "-"
    ) +

    "\nJumlah: " +
    money(
      expense.amount
    ) +

    "\n\nData yang dihapus tidak dapat dikembalikan.";


  const confirmed =
    confirm(
      message
    );


  if (!confirmed) {
    return;
  }


  try {

    await deleteDoc(

      doc(
        db,
        "expenses",
        id
      )

    );


    await loadAll();


    financeView();


    toast(
      "Pengeluaran berhasil dihapus."
    );


  } catch (error) {

    console.error(
      "Delete Expense Error:",
      error
    );


    toast(
      error.message ||
      "Gagal menghapus pengeluaran."
    );

  }

}
/* =========================================================
   REPORTS
========================================================= */

function reportsView() {

  const revenue =
    sales.reduce(
      (total, sale) =>
        total +
        normalizeNumber(
          sale.total
        ),
      0
    );


  const cost =
    sales.reduce(
      (total, sale) => {

        const items =
          Array.isArray(
            sale.items
          )
            ? sale.items
            : [];


        return (
          total +
          items.reduce(
            (itemTotal, item) =>
              itemTotal +
              normalizeNumber(
                item.costPrice
              ) *
              normalizeNumber(
                item.qty
              ),
            0
          )
        );

      },
      0
    );


  const expense =
    expenses.reduce(
      (total, item) =>
        total +
        normalizeNumber(
          item.amount
        ),
      0
    );


  const grossProfit =
    revenue -
    cost -
    expense;


  const content =
    $("#pageContent");

  if (!content) {
    return;
  }


  content.innerHTML = `

    <div class="grid cards">

      <div class="card">

        <div class="stat-label">
          Penjualan
        </div>

        <div class="stat-value">
          ${money(revenue)}
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
          ${money(expense)}
        </div>

      </div>


      <div class="card">

        <div class="stat-label">
          Laba Setelah Pengeluaran*
        </div>

        <div class="stat-value">
          ${money(grossProfit)}
        </div>

      </div>

    </div>


    <div
      class="panel"
      style="margin-top:18px"
    >

      <p class="muted">

        *Perhitungan menggunakan HPP berdasarkan
        costPrice yang tersimpan pada item transaksi,
        kemudian dikurangi pengeluaran.

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
              products.length

                ? products
                    .map(
                      product => {

                        const sellingPrice =
                          normalizeNumber(
                            product.sellingPrice
                          );


                        const costPrice =
                          normalizeNumber(
                            product.costPrice
                          );


                        return `

                          <tr>

                            <td>
                              ${escapeHTML(
                                product.name
                              )}
                            </td>

                            <td>
                              ${money(
                                sellingPrice
                              )}
                            </td>

                            <td>
                              ${money(
                                costPrice
                              )}
                            </td>

                            <td>
                              ${money(
                                sellingPrice -
                                costPrice
                              )}
                            </td>

                            <td>

                              ${normalizeNumber(
                                product.stock
                              )}

                              ${escapeHTML(
                                product.unit ||
                                ""
                              )}

                            </td>

                          </tr>

                        `;

                      }
                    )
                    .join("")

                : `

                    <tr>

                      <td
                        colspan="5"
                        class="empty"
                      >
                        Belum ada produk.
                      </td>

                    </tr>

                  `
            }

          </tbody>

        </table>

      </div>

    </div>

  `;

}


/* =========================================================
   MODAL
========================================================= */

window.closeModal =
  () => {

    const modalRoot =
      $("#modalRoot");

    if (modalRoot) {
      modalRoot.innerHTML = "";
    }

  };


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

  const container =
    $("#toast");


  if (!container) {

    alert(message);

    return;

  }


  const element =
    document.createElement(
      "div"
    );


  element.className =
    "toast";


  element.textContent =
    message;


  container.appendChild(
    element
  );


  setTimeout(
    () => {

      element.remove();

    },
    2800
  );

}
