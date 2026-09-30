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

    <div class="grid grid-4">

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
                              item.category
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
                                flex-wrap:wrap
                              "
                            >

                              <button
                                type="button"
                                class="secondary-btn"
                                data-edit-expense="${escapeHTML(
                                  item.id
                                )}"
                              >
                                Edit
                              </button>


                              <button
                                type="button"
                                class="danger-btn"
                                data-delete-expense="${escapeHTML(
                                  item.id
                                )}"
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


  const expenseButton =
    $("#expenseBtn");

  if (expenseButton) {
    expenseButton.onclick =
      () => expenseModal();
  }


  content
    .querySelectorAll(
      "[data-edit-expense]"
    )
    .forEach(button => {

      button.onclick = () => {

        const expense =
          expenses.find(
            item =>
              item.id ===
              button.dataset.editExpense
          );


        if (!expense) {
          return toast(
            "Data pengeluaran tidak ditemukan."
          );
        }


        expenseModal(expense);

      };

    });


  content
    .querySelectorAll(
      "[data-delete-expense]"
    )
    .forEach(button => {

      button.onclick = () =>
        removeExpense(
          button.dataset.deleteExpense
        );

    });

}


/* =========================================================
   EXPENSE MODAL
========================================================= */

function expenseModal(expense = null) {

  const isEdit =
    Boolean(expense?.id);


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
                ? "Edit Pengeluaran"
                : "Tambah Pengeluaran"
            }
          </h2>


          <button
            class="close"
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
                value="${escapeHTML(
                  expense?.date ||
                  todayISO()
                )}"
                required
              >

            </div>


            <div class="form-group">

              <label>
                Kategori
              </label>

              <input
                name="category"
                required
                value="${escapeHTML(
                  expense?.category ||
                  ""
                )}"
                placeholder="Listrik / Bahan / Operasional"
              >

            </div>


            <div class="form-group">

              <label>
                Jumlah
              </label>

              <input
                name="amount"
                type="number"
                min="0"
                step="1"
                required
                value="${normalizeNumber(
                  expense?.amount
                )}"
              >

            </div>


            <div class="form-group">

              <label>
                Keterangan
              </label>

              <input
                name="description"
                value="${escapeHTML(
                  expense?.description ||
                  ""
                )}"
                placeholder="Keterangan pengeluaran"
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


  form.onsubmit =
    async event => {

      event.preventDefault();


      const data =
        new FormData(
          event.target
        );


      const date =
        String(
          data.get("date") || ""
        );


      const amount =
        normalizeNumber(
          data.get("amount")
        );


      const category =
        String(
          data.get("category") || ""
        ).trim();


      const description =
        String(
          data.get("description") || ""
        ).trim();


      if (!date) {

        return toast(
          "Tanggal pengeluaran wajib diisi."
        );

      }


      if (!category) {

        return toast(
          "Kategori wajib diisi."
        );

      }


      if (amount <= 0) {

        return toast(
          "Jumlah pengeluaran harus lebih dari 0."
        );

      }


      const payload = {

        date,

        category,

        amount,

        description,

        updatedAt:
          serverTimestamp()

      };


      try {

        if (isEdit) {

          await updateDoc(
            doc(
              db,
              "expenses",
              expense.id
            ),
            payload
          );

        } else {

          await addDoc(
            collection(
              db,
              "expenses"
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

        financeView();

        toast(
          isEdit
            ? "Pengeluaran berhasil diperbarui."
            : "Pengeluaran berhasil disimpan."
        );


      } catch (error) {

        console.error(
          "Expense Save Error:",
          error
        );

        toast(
          isEdit
            ? "Gagal memperbarui pengeluaran."
            : "Gagal menyimpan pengeluaran."
        );

      }

    };

}


/* =========================================================
   DELETE EXPENSE
========================================================= */

async function removeExpense(id) {

  const expense =
    expenses.find(
      item => item.id === id
    );


  if (!expense) {

    return toast(
      "Data pengeluaran tidak ditemukan."
    );

  }


  const confirmed =
    confirm(
      "Hapus pengeluaran ini?\n\n" +
      `Tanggal: ${dateText(expense.date)}\n` +
      `Kategori: ${expense.category || "-"}\n` +
      `Keterangan: ${expense.description || "-"}\n` +
      `Jumlah: ${money(expense.amount)}\n\n` +
      "Data yang sudah dihapus tidak dapat dikembalikan."
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
      "Gagal menghapus pengeluaran."
    );

  }

}
