export function getInitialGsCode(appName: string, appDescription: string): string {
  return `/**
 * ${appName || "Aplikasi CRUD"} - Google Apps Script Backend
 * Deskripsi: ${appDescription || "Aplikasi CRUD Google Sheets"}
 * Dibuat secara otomatis oleh AppScript Generator
 */

// Menampilkan halaman web utama
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('${appName || "Aplikasi CRUD"}')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Helper untuk menyertakan file HTML lain (seperti CSS/JS jika dipisah)
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Mendapatkan ID Spreadsheet aktif atau membuat baru jika belum ada
 */
function getSpreadsheetId() {
  const properties = PropertiesService.getScriptProperties();
  let sheetId = properties.getProperty('SPREADSHEET_ID');
  
  if (!sheetId) {
    try {
      const activeSs = SpreadsheetApp.getActiveSpreadsheet();
      if (activeSs) {
        sheetId = activeSs.getId();
        properties.setProperty('SPREADSHEET_ID', sheetId);
      }
    } catch (e) {
      const newSs = SpreadsheetApp.create('${appName || "Aplikasi"} Database');
      sheetId = newSs.getId();
      properties.setProperty('SPREADSHEET_ID', sheetId);
    }
  }
  return sheetId;
}

/**
 * Memastikan sheet yang dibutuhkan ada
 */
function initDatabase() {
  const ss = SpreadsheetApp.openById(getSpreadsheetId());
  let sheet = ss.getSheetByName("Data_Utama");
  if (!sheet) {
    sheet = ss.insertSheet("Data_Utama");
    // Header Kolom
    sheet.appendRow(["ID", "Tanggal Buat", "Nama", "Kategori", "Keterangan", "Status", "Email Pembuat"]);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#6366f1").setFontColor("#ffffff");
  }
  return sheet;
}

/**
 * READ: Mengambil semua data
 */
function getAllData() {
  try {
    initDatabase();
    const ss = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = ss.getSheetByName("Data_Utama");
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length <= 1) return { success: true, data: [] };
    
    const headers = values[0];
    const rows = values.slice(1);
    
    const formattedData = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        let val = row[index];
        if (val instanceof Date) {
          val = val.toISOString().split('T')[0];
        }
        obj[header.toLowerCase().replace(/\\s+/g, '_')] = val;
      });
      return obj;
    });
    
    return { success: true, data: formattedData };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * CREATE: Menambahkan data baru
 */
function addRecord(payload) {
  try {
    initDatabase();
    const ss = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = ss.getSheetByName("Data_Utama");
    
    const id = Utilities.getUuid();
    const timestamp = new Date();
    const userEmail = Session.getActiveUser().getEmail() || "anonymous@mail.com";
    
    sheet.appendRow([
      id,
      timestamp,
      payload.nama || "-",
      payload.kategori || "-",
      payload.keterangan || "-",
      payload.status || "Aktif",
      userEmail
    ]);
    
    return { success: true, message: "Data berhasil ditambahkan!", id: id };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * UPDATE: Memperbarui data
 */
function updateRecord(id, payload) {
  try {
    initDatabase();
    const ss = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = ss.getSheetByName("Data_Utama");
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.getRange(i + 1, 3).setValue(payload.nama);
        sheet.getRange(i + 1, 4).setValue(payload.kategori);
        sheet.getRange(i + 1, 5).setValue(payload.keterangan);
        sheet.getRange(i + 1, 6).setValue(payload.status);
        return { success: true, message: "Data berhasil diperbarui!" };
      }
    }
    return { success: false, error: "ID data tidak ditemukan." };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * DELETE: Menghapus data
 */
function deleteRecord(id) {
  try {
    initDatabase();
    const ss = SpreadsheetApp.openById(getSpreadsheetId());
    const sheet = ss.getSheetByName("Data_Utama");
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Data berhasil dihapus!" };
      }
    }
    return { success: false, error: "ID data tidak ditemukan." };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}`;
}

export function getInitialHtmlCode(appName: string, appDescription: string): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName || "Aplikasi CRUD"}</title>
  <!-- Bootstrap 5 CDN -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Google Fonts: Inter -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <!-- Bootstrap Icons -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
  
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f8fafc;
      color: #1e293b;
    }
    .navbar {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .card-stat {
      border: none;
      border-radius: 16px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .card-stat:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    .table-container {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      border: 1px solid #f1f5f9;
    }
    .btn-indigo {
      background-color: #4f46e5;
      color: white;
      border-radius: 10px;
      font-weight: 500;
      padding: 8px 16px;
      transition: all 0.2s;
    }
    .btn-indigo:hover {
      background-color: #4338ca;
      color: white;
      transform: translateY(-1px);
    }
    .badge-active {
      background-color: #dcfce7;
      color: #15803d;
    }
    .badge-inactive {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    .form-control, .form-select {
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      padding: 10px 14px;
    }
    .form-control:focus, .form-select:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
  </style>
</head>
<body>

  <!-- Navbar -->
  <nav class="navbar navbar-expand-lg navbar-dark py-3">
    <div class="container">
      <a class="navbar-brand d-flex align-items-center gap-2 fw-bold" href="#">
        <i class="bi bi-cpu-fill"></i>
        <span>${appName || "Aplikasi CRUD"}</span>
      </a>
      <span class="navbar-text text-white-50 d-none d-sm-inline-block">
        Google Apps Script Web App
      </span>
    </div>
  </nav>

  <div class="container py-5">
    <!-- Header Deskripsi -->
    <div class="row mb-5">
      <div class="col-12">
        <div class="bg-white p-4 rounded-4 shadow-sm border border-slate-100">
          <h5 class="fw-bold text-slate-800 mb-2">Deskripsi Aplikasi</h5>
          <p class="text-muted mb-0 small">${appDescription || "Aplikasi ini mempermudah pengelolaan data utama secara cepat dan efisien melalui integrasi dengan Google Sheets."}</p>
        </div>
      </div>
    </div>

    <!-- Ringkasan Statistik -->
    <div class="row g-4 mb-5">
      <div class="col-md-4">
        <div class="card card-stat bg-white p-4">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="text-uppercase text-muted small fw-semibold">Total Item</h6>
              <h3 class="fw-black mb-0 text-indigo" id="stat-total">0</h3>
            </div>
            <div class="bg-indigo-subtle p-3 rounded-3 text-indigo">
              <i class="bi bi-folder2-open fs-3 text-indigo"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card card-stat bg-white p-4">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="text-uppercase text-muted small fw-semibold">Status Aktif</h6>
              <h3 class="fw-black mb-0 text-success" id="stat-active">0</h3>
            </div>
            <div class="bg-success-subtle p-3 rounded-3 text-success">
              <i class="bi bi-check-circle-fill fs-3"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card card-stat bg-white p-4">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h6 class="text-uppercase text-muted small fw-semibold">Status Non-Aktif</h6>
              <h3 class="fw-black mb-0 text-danger" id="stat-inactive">0</h3>
            </div>
            <div class="bg-danger-subtle p-3 rounded-3 text-danger">
              <i class="bi bi-x-circle-fill fs-3"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Area Tabel Utama -->
    <div class="table-container">
      <div class="row align-items-center justify-content-between g-3 mb-4">
        <div class="col-md-5">
          <div class="input-group">
            <span class="input-group-text bg-white border-end-0 text-muted">
              <i class="bi bi-search"></i>
            </span>
            <input type="text" id="searchInput" class="form-control border-start-0 ps-0" placeholder="Cari berdasarkan nama atau kategori..." onkeyup="filterTable()">
          </div>
        </div>
        <div class="col-md-4 text-md-end">
          <button class="btn btn-indigo d-inline-flex align-items-center gap-2" data-bs-toggle="modal" data-bs-target="#modalTambah">
            <i class="bi bi-plus-lg"></i>
            <span>Tambah Data</span>
          </button>
        </div>
      </div>

      <!-- Tabel -->
      <div class="table-responsive">
        <table class="table align-middle table-hover mb-0" id="mainTable">
          <thead class="table-light">
            <tr>
              <th scope="col" style="width: 50px;">#</th>
              <th scope="col">Nama Item</th>
              <th scope="col">Kategori</th>
              <th scope="col">Keterangan</th>
              <th scope="col" style="width: 120px;">Status</th>
              <th scope="col" class="text-center" style="width: 150px;">Aksi</th>
            </tr>
          </thead>
          <tbody id="tableBody">
            <tr>
              <td colspan="6" class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm text-indigo me-2" role="status"></div>
                Sedang memuat data dari Spreadsheet...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Modal Tambah Data -->
  <div class="modal fade" id="modalTambah" tabindex="-1" aria-labelledby="modalTambahLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-bottom-0 pb-0">
          <h5 class="modal-title fw-bold text-slate-800" id="modalTambahLabel">Tambah Data Baru</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="closeTambahBtn"></button>
        </div>
        <form id="formTambah" onsubmit="submitFormTambah(event)">
          <div class="modal-body py-4">
            <div class="mb-3">
              <label for="namaItem" class="form-label fw-semibold text-slate-700">Nama Item</label>
              <input type="text" class="form-control" id="namaItem" required placeholder="Contoh: Laptop ThinkPad X1 Carbon">
            </div>
            <div class="mb-3">
              <label for="kategoriItem" class="form-label fw-semibold text-slate-700">Kategori</label>
              <select class="form-select" id="kategoriItem" required>
                <option value="" disabled selected>Pilih Kategori...</option>
                <option value="Elektronik">Elektronik</option>
                <option value="Furnitur">Furnitur</option>
                <option value="Alat Tulis">Alat Tulis</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div class="mb-3">
              <label for="keteranganItem" class="form-label fw-semibold text-slate-700">Keterangan</label>
              <textarea class="form-control" id="keteranganItem" rows="3" placeholder="Deskripsi singkat item..."></textarea>
            </div>
            <div class="mb-0">
              <label for="statusItem" class="form-label fw-semibold text-slate-700">Status</label>
              <select class="form-select" id="statusItem" required>
                <option value="Aktif">Aktif</option>
                <option value="Non-Aktif">Non-Aktif</option>
              </select>
            </div>
          </div>
          <div class="modal-footer border-top-0 pt-0">
            <button type="button" class="btn btn-light rounded-3 px-4" data-bs-dismiss="modal">Batal</button>
            <button type="submit" class="btn btn-indigo px-4" id="btnSubmitTambah">Simpan Data</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Modal Edit Data -->
  <div class="modal fade" id="modalEdit" tabindex="-1" aria-labelledby="modalEditLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content rounded-4 border-0 shadow">
        <div class="modal-header border-bottom-0 pb-0">
          <h5 class="modal-title fw-bold text-slate-800" id="modalEditLabel">Edit Data</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="closeEditBtn"></button>
        </div>
        <form id="formEdit" onsubmit="submitFormEdit(event)">
          <input type="hidden" id="editId">
          <div class="modal-body py-4">
            <div class="mb-3">
              <label for="editNama" class="form-label fw-semibold text-slate-700">Nama Item</label>
              <input type="text" class="form-control" id="editNama" required>
            </div>
            <div class="mb-3">
              <label for="editKategori" class="form-label fw-semibold text-slate-700">Kategori</label>
              <select class="form-select" id="editKategori" required>
                <option value="Elektronik">Elektronik</option>
                <option value="Furnitur">Furnitur</option>
                <option value="Alat Tulis">Alat Tulis</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div class="mb-3">
              <label for="editKeterangan" class="form-label fw-semibold text-slate-700">Keterangan</label>
              <textarea class="form-control" id="editKeterangan" rows="3"></textarea>
            </div>
            <div class="mb-0">
              <label for="editStatus" class="form-label fw-semibold text-slate-700">Status</label>
              <select class="form-select" id="editStatus" required>
                <option value="Aktif">Aktif</option>
                <option value="Non-Aktif">Non-Aktif</option>
              </select>
            </div>
          </div>
          <div class="modal-footer border-top-0 pt-0">
            <button type="button" class="btn btn-light rounded-3 px-4" data-bs-dismiss="modal">Batal</button>
            <button type="submit" class="btn btn-indigo px-4" id="btnSubmitEdit">Simpan Perubahan</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
    <div id="toastNotification" class="toast align-items-center text-white bg-dark border-0 rounded-3" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body" id="toastMessage">
          Notifikasi berhasil ditampilkan!
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  </div>

  <!-- Bootstrap 5 Bundle JS (CDN) -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

  <script>
    // State lokal aplikasi
    let appData = [];

    // Cek jika berjalan di Google Apps Script (Web App) atau Local/Demo
    const isGoogleAppsScript = typeof google !== 'undefined' && google.script && google.script.run;

    // Menjalankan inisialisasi awal
    document.addEventListener("DOMContentLoaded", function() {
      loadAllData();
    });

    // Menampilkan Notifikasi Toast
    function showNotification(message, bgClass = 'bg-dark') {
      const toastEl = document.getElementById('toastNotification');
      const toastMsg = document.getElementById('toastMessage');
      toastEl.className = 'toast align-items-center text-white border-0 rounded-3 ' + bgClass;
      toastMsg.innerText = message;
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    }

    // Load Data Utama
    function loadAllData() {
      const tbody = document.getElementById("tableBody");
      
      if (isGoogleAppsScript) {
        google.script.run
          .withSuccessHandler(function(response) {
            if (response.success) {
              appData = response.data;
              renderTable(appData);
            } else {
              tbody.innerHTML = \`<tr><td colspan="6" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle-fill me-2"></i>Gagal memuat data: \${response.error}</td></tr>\`;
            }
          })
          .withFailureHandler(function(err) {
            tbody.innerHTML = \`<tr><td colspan="6" class="text-center text-danger py-4"><i class="bi bi-exclamation-triangle-fill me-2"></i>Koneksi server gagal: \${err.toString()}</td></tr>\`;
          })
          .getAllData();
      } else {
        // Fallback untuk Simulasi Local (LocalStorage)
        const local = localStorage.getItem("asg_mock_db");
        if (local) {
          appData = JSON.parse(local);
        } else {
          // Default mock data jika kosong
          appData = [
            { id: "mock-1", nama: "MacBook Pro M2", kategori: "Elektronik", keterangan: "Inventaris Tim Developer", status: "Aktif" },
            { id: "mock-2", nama: "Kursi Ergonomis Steelcase", kategori: "Furnitur", keterangan: "Fasilitas Office Lantai 3", status: "Aktif" },
            { id: "mock-3", nama: "Whiteboard Mini", kategori: "Lainnya", keterangan: "Rusak di bagian penyangga", status: "Non-Aktif" }
          ];
          localStorage.setItem("asg_mock_db", JSON.stringify(appData));
        }
        
        setTimeout(() => {
          renderTable(appData);
          showNotification("Demo Mode: Berhasil memuat data lokal simulator.", "bg-success");
        }, 800);
      }
    }

    // Merender baris tabel berdasarkan data array
    function renderTable(data) {
      const tbody = document.getElementById("tableBody");
      tbody.innerHTML = "";
      
      if (data.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="6" class="text-center text-muted py-4"><i class="bi bi-info-circle me-2"></i>Tidak ada data yang ditemukan.</td></tr>\`;
        updateStatistics(0, 0, 0);
        return;
      }

      let activeCount = 0;
      let inactiveCount = 0;

      data.forEach((item, index) => {
        const tr = document.createElement("tr");
        
        const badgeClass = item.status === "Aktif" ? "badge-active" : "badge-inactive";
        if (item.status === "Aktif") activeCount++;
        else inactiveCount++;

        tr.innerHTML = \`
          <td>\${index + 1}</td>
          <td class="fw-semibold">\${escapeHtml(item.nama)}</td>
          <td><span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2.5 py-1 rounded-pill">\${escapeHtml(item.kategori)}</span></td>
          <td class="text-muted small">\${escapeHtml(item.keterangan || '-')}</td>
          <td><span class="badge \${badgeClass} px-3 py-1 rounded-pill">\${escapeHtml(item.status)}</span></td>
          <td class="text-center">
            <div class="btn-group gap-1">
              <button class="btn btn-sm btn-outline-primary rounded-3" onclick="openEditModal('\${item.id}')" title="Edit"><i class="bi bi-pencil-square"></i></button>
              <button class="btn btn-sm btn-outline-danger rounded-3" onclick="deleteItem('\${item.id}')" title="Hapus"><i class="bi bi-trash3-fill"></i></button>
            </div>
          </td>
        \`;
        tbody.appendChild(tr);
      });

      updateStatistics(data.length, activeCount, inactiveCount);
    }

    // Memperbarui card widget di atas
    function updateStatistics(total, active, inactive) {
      document.getElementById("stat-total").innerText = total;
      document.getElementById("stat-active").innerText = active;
      document.getElementById("stat-inactive").innerText = inactive;
    }

    // Submit form tambah data baru
    function submitFormTambah(event) {
      event.preventDefault();
      const btn = document.getElementById("btnSubmitTambah");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Menyimpan...';

      const payload = {
        nama: document.getElementById("namaItem").value,
        kategori: document.getElementById("kategoriItem").value,
        keterangan: document.getElementById("keteranganItem").value,
        status: document.getElementById("statusItem").value
      };

      if (isGoogleAppsScript) {
        google.script.run
          .withSuccessHandler(function(response) {
            btn.disabled = false;
            btn.innerText = "Simpan Data";
            if (response.success) {
              document.getElementById("formTambah").reset();
              document.getElementById("closeTambahBtn").click();
              showNotification("Data berhasil disimpan ke Spreadsheet!", "bg-success");
              loadAllData();
            } else {
              showNotification("Error: " + response.error, "bg-danger");
            }
          })
          .withFailureHandler(function(err) {
            btn.disabled = false;
            btn.innerText = "Simpan Data";
            showNotification("Koneksi gagal: " + err.toString(), "bg-danger");
          })
          .addRecord(payload);
      } else {
        // Mode Simulator
        const newRecord = {
          id: 'mock-' + Date.now(),
          ...payload
        };
        appData.push(newRecord);
        localStorage.setItem("asg_mock_db", JSON.stringify(appData));
        
        setTimeout(() => {
          btn.disabled = false;
          btn.innerText = "Simpan Data";
          document.getElementById("formTambah").reset();
          document.getElementById("closeTambahBtn").click();
          showNotification("Simulator: Data baru berhasil dibuat!", "bg-success");
          renderTable(appData);
        }, 600);
      }
    }

    // Membuka modal Edit Data
    function openEditModal(id) {
      const item = appData.find(i => i.id === id);
      if (!item) return;

      document.getElementById("editId").value = item.id;
      document.getElementById("editNama").value = item.nama;
      document.getElementById("editKategori").value = item.kategori;
      document.getElementById("editKeterangan").value = item.keterangan || "";
      document.getElementById("editStatus").value = item.status;

      const editModal = new bootstrap.Modal(document.getElementById('modalEdit'));
      editModal.show();
    }

    // Submit form edit data
    function submitFormEdit(event) {
      event.preventDefault();
      const btn = document.getElementById("btnSubmitEdit");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Memperbarui...';

      const id = document.getElementById("editId").value;
      const payload = {
        nama: document.getElementById("editNama").value,
        kategori: document.getElementById("editKategori").value,
        keterangan: document.getElementById("editKeterangan").value,
        status: document.getElementById("editStatus").value
      };

      if (isGoogleAppsScript) {
        google.script.run
          .withSuccessHandler(function(response) {
            btn.disabled = false;
            btn.innerText = "Simpan Perubahan";
            if (response.success) {
              document.getElementById("closeEditBtn").click();
              showNotification("Data berhasil diperbarui di Spreadsheet!", "bg-success");
              loadAllData();
            } else {
              showNotification("Error: " + response.error, "bg-danger");
            }
          })
          .withFailureHandler(function(err) {
            btn.disabled = false;
            btn.innerText = "Simpan Perubahan";
            showNotification("Koneksi gagal: " + err.toString(), "bg-danger");
          })
          .updateRecord(id, payload);
      } else {
        // Mode Simulator
        const index = appData.findIndex(i => i.id === id);
        if (index !== -1) {
          appData[index] = { ...appData[index], ...payload };
          localStorage.setItem("asg_mock_db", JSON.stringify(appData));
        }

        setTimeout(() => {
          btn.disabled = false;
          btn.innerText = "Simpan Perubahan";
          document.getElementById("closeEditBtn").click();
          showNotification("Simulator: Perubahan berhasil disimpan!", "bg-success");
          renderTable(appData);
        }, 600);
      }
    }

    // Menghapus Item
    function deleteItem(id) {
      if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;

      if (isGoogleAppsScript) {
        google.script.run
          .withSuccessHandler(function(response) {
            if (response.success) {
              showNotification("Data berhasil terhapus!", "bg-success");
              loadAllData();
            } else {
              showNotification("Error: " + response.error, "bg-danger");
            }
          })
          .withFailureHandler(function(err) {
            showNotification("Koneksi gagal: " + err.toString(), "bg-danger");
          })
          .deleteRecord(id);
      } else {
        // Mode Simulator
        appData = appData.filter(i => i.id !== id);
        localStorage.setItem("asg_mock_db", JSON.stringify(appData));
        showNotification("Simulator: Data terhapus!", "bg-success");
        renderTable(appData);
      }
    }

    // Memfilter data tabel di client-side (realtime search)
    function filterTable() {
      const query = document.getElementById("searchInput").value.toLowerCase();
      const filtered = appData.filter(item => 
        item.nama.toLowerCase().includes(query) || 
        item.kategori.toLowerCase().includes(query) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(query))
      );
      renderTable(filtered);
    }

    // Utility membersihkan HTML input
    function escapeHtml(text) {
      if (!text) return "";
      return text
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  </script>
</body>
</html>`;
}
