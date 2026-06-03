/* ─────────────────────────────────────────────
   Prompt Builder — generates plan.md from wizard data
   ───────────────────────────────────────────── */

import type { WizardData, MenuItem, UIComponent } from "./store";

const promptThemeColors: Record<string, string> = {
  "Biru profesional": "#0d6efd",
  "Hijau segar": "#198754",
  "Ungu modern": "#6f42c1",
  "Abu netral": "#6c757d",
};

export function compileCanvasToHTML(menu: MenuItem, themeColor: string): string {
  const components = menu.layoutComponents || [];
  if (components.length === 0) return "";

  let html = `<div class="container-fluid py-4" id="page_${menu.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}">\n`;
  html += `  <div class="row g-3">\n`;

  for (const comp of components) {
    const colClass = comp.width || "col-12";
    html += `    <div class="${colClass}">\n`;

    switch (comp.type) {
      case "heading":
        html += `      <h2 class="mb-3 Outfit-font text-dark">${comp.label}</h2>\n`;
        break;
      case "paragraph":
        html += `      <p class="text-muted leading-relaxed">${comp.label}</p>\n`;
        break;
      case "input":
        html += `      <div class="mb-3">\n`;
        html += `        <label class="form-label fw-semibold">${comp.label}${comp.required ? ' <span class="text-danger">*</span>' : ''}</label>\n`;
        html += `        <input type="text" id="${comp.id}" name="${comp.associatedColumn || comp.id}" class="form-control form-control-lg bg-light border-light" placeholder="${comp.placeholder || ''}" ${comp.required ? 'required' : ''}>\n`;
        html += `      </div>\n`;
        break;
      case "textarea":
        html += `      <div class="mb-3">\n`;
        html += `        <label class="form-label fw-semibold">${comp.label}${comp.required ? ' <span class="text-danger">*</span>' : ''}</label>\n`;
        html += `        <textarea id="${comp.id}" name="${comp.associatedColumn || comp.id}" class="form-control form-control-lg bg-light border-light" rows="3" placeholder="${comp.placeholder || ''}" ${comp.required ? 'required' : ''}></textarea>\n`;
        html += `      </div>\n`;
        break;
      case "select":
        html += `      <div class="mb-3">\n`;
        html += `        <label class="form-label fw-semibold">${comp.label}${comp.required ? ' <span class="text-danger">*</span>' : ''}</label>\n`;
        html += `        <select id="${comp.id}" name="${comp.associatedColumn || comp.id}" class="form-select form-select-lg bg-light border-light" ${comp.required ? 'required' : ''}>\n`;
        for (const opt of (comp.options || [])) {
          html += `          <option value="${opt}">${opt}</option>\n`;
        }
        html += `        </select>\n`;
        html += `      </div>\n`;
        break;
      case "date":
        html += `      <div class="mb-3">\n`;
        html += `        <label class="form-label fw-semibold">${comp.label}${comp.required ? ' <span class="text-danger">*</span>' : ''}</label>\n`;
        html += `        <input type="date" id="${comp.id}" name="${comp.associatedColumn || comp.id}" class="form-control form-control-lg bg-light border-light" ${comp.required ? 'required' : ''}>\n`;
        html += `      </div>\n`;
        break;
      case "button":
        const actionType = comp.buttonAction === "submit" ? "submit" : "button";
        html += `      <div class="mb-3">\n`;
        html += `        <button type="${actionType}" id="${comp.id}" class="btn btn-lg w-100 shadow-sm transition-all text-white" style="background-color: ${themeColor};">\n`;
        html += `          ${comp.label}\n`;
        html += `        </button>\n`;
        html += `      </div>\n`;
        break;
      case "table":
        html += `      <div class="card border-light shadow-sm mb-4">\n`;
        html += `        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">\n`;
        html += `          <h5 class="mb-0 fw-bold Outfit-font">${comp.label}</h5>\n`;
        html += `          <div class="input-group input-group-sm w-auto">\n`;
        html += `            <input type="text" id="search_${comp.id}" class="form-control bg-light" placeholder="Cari...">\n`;
        html += `          </div>\n`;
        html += `        </div>\n`;
        html += `        <div class="table-responsive">\n`;
        html += `          <table class="table table-hover align-middle mb-0" id="table_${comp.id}">\n`;
        html += `            <thead class="table-light">\n`;
        html += `              <tr>\n`;
        html += `                <th>Data</th>\n`;
        html += `              </tr>\n`;
        html += `            </thead>\n`;
        html += `            <tbody>\n`;
        html += `              <tr><td class="text-center text-muted py-4">Memuat data...</td></tr>\n`;
        html += `            </tbody>\n`;
        html += `          </table>\n`;
        html += `        </div>\n`;
        html += `      </div>\n`;
        break;
      case "chart":
        html += `      <div class="card border-light shadow-sm mb-4">\n`;
        html += `        <div class="card-body">\n`;
        html += `          <h5 class="card-title fw-bold Outfit-font mb-3">${comp.label}</h5>\n`;
        html += `          <div class="chart-container" style="position: relative; height:250px; width:100%">\n`;
        html += `            <canvas id="chart_${comp.id}"></canvas>\n`;
        html += `          </div>\n`;
        html += `        </div>\n`;
        html += `      </div>\n`;
        break;
      case "kpi":
        html += `      <div class="card border-light shadow-sm mb-3">\n`;
        html += `        <div class="card-body d-flex align-items-center">\n`;
        html += `          <div class="rounded-circle p-3 bg-light d-flex align-items-center justify-content-center me-3" style="color: ${themeColor}; width: 48px; height: 48px;">\n`;
        html += `            <i class="bi bi-graph-up fs-4"></i>\n`;
        html += `          </div>\n`;
        html += `          <div>\n`;
        html += `            <h6 class="text-muted mb-1 text-uppercase fw-semibold" style="font-size: 11px;">${comp.label}</h6>\n`;
        html += `            <h3 class="mb-0 fw-bold Outfit-font" id="kpi_${comp.id}">-</h3>\n`;
        html += `          </div>\n`;
        html += `        </div>\n`;
        html += `      </div>\n`;
        break;
    }
    html += `    </div>\n`;
  }

  html += `  </div>\n`;
  html += `</div>`;
  return html;
}

const iconToEmojiMap: Record<string, string> = {
  ClipboardList: "📋",
  Users: "👥",
  BarChart3: "📊",
  Package: "📦",
  DollarSign: "💰",
  Calendar: "📅",
  Bell: "🔔",
  FileEdit: "📝",
  Settings: "⚙️",
  Folder: "🗂️",
  TrendingUp: "📈",
  Tag: "🏷️",
};

function getMenuEmoji(iconName: string): string {
  return iconToEmojiMap[iconName] || iconName;
}

export function buildPrompt(data: WizardData): string {
  const lines: string[] = [];
  const ln = (s = "") => lines.push(s);

  // ── Header
  ln(`# ${data.appName} — Google Apps Script Implementation Plan`);
  ln();
  ln(`## Overview`);
  ln(data.appDescription);
  ln();

  // ── Tech Stack
  ln(`## Technical Stack`);
  ln(`- **Platform:** Google Apps Script (Web App)`);
  ln(`- **Data storage:** ${data.dataSource}`);
  ln(`- **Frontend:** HTML Service (Bootstrap 5 CDN)`);
  ln(`- **Backend:** GAS server-side functions`);
  ln(`- **Tipe pengguna:** ${data.userType}`);
  ln();

  // ── Sheets Structure
  ln(`## Google Sheets Structure`);
  ln();
  if (data.hasLogin) {
    ln(`### Sheet: \`Sheet_Users\``);
    ln(`Digunakan untuk menyimpan data kredensial akun pengguna (Username, Password, dan Role).`);
    ln();
    ln(`| Kolom | Tipe | Wajib | Keterangan |`);
    ln(`|-------|------|-------|------------|`);
    ln(`| id | String (UUID) | Ya | Auto-generate |`);
    ln(`| username | Teks | Ya | Username unik untuk login |`);
    ln(`| password | Teks | Ya | Password (plain text) |`);
    ln(`| role | Pilihan | Ya | Role pengguna: ${data.loginAccess || "Admin, User"} |`);
    ln(`| nama_lengkap | Teks | Ya | Nama lengkap pengguna |`);
    ln();
  }
  for (const sheet of data.sheets) {
    ln(`### Sheet: \`${sheet.sheetName}\``);
    ln(`Terkait menu: **${sheet.menuName}**`);
    ln();
    ln(`| Kolom | Tipe | Wajib | Keterangan |`);
    ln(`|-------|------|-------|------------|`);
    ln(`| id | String (UUID) | Ya | Auto-generate |`);
    for (const col of sheet.columns) {
      ln(`| ${col.name} | ${col.type} | ${col.required ? "Ya" : "Tidak"} | ${col.note || "-"} |`);
    }
    if (sheet.autoCreatedAt) ln(`| createdAt | Timestamp | Ya | Auto: tanggal dibuat |`);
    if (sheet.autoUpdatedAt) ln(`| updatedAt | Timestamp | Ya | Auto: tanggal diupdate |`);
    if (sheet.autoCreatedBy) ln(`| createdBy | String | Ya | Auto: username pembuat |`);
    ln();
  }

  // ── Menu & Features
  ln(`## Menu & Features`);
  ln();
  for (const menu of data.menus) {
    ln(`### Menu: ${getMenuEmoji(menu.icon)} ${menu.name}`);
    ln(`**Fungsi:** ${menu.description}`);
    ln();
    ln(`**CRUD Operations:**`);
    if (menu.crud.create) ln(`- ✅ **CREATE**: Form input data baru dengan validasi field wajib. Tampilkan modal form, validasi client-side dan server-side, simpan ke Sheet, tampilkan notifikasi sukses, refresh tabel.`);
    if (menu.crud.read) ln(`- ✅ **READ**: Tampilkan semua data dalam tabel/card dengan pagination (10 per halaman). Support sorting dan pencarian.`);
    if (menu.crud.update) ln(`- ✅ **UPDATE**: Form edit data dengan pre-fill dari data existing. Klik baris → modal edit → validasi → update Sheet → refresh tabel.`);
    if (menu.crud.delete) ln(`- ✅ **DELETE**: Hapus data dengan konfirmasi dialog. Klik tombol hapus → modal konfirmasi "Apakah Anda yakin?" → hapus dari Sheet → refresh tabel.`);
    ln();
    if (menu.hasFilter) {
      ln(`**Filter/Pencarian:** Ya — berdasarkan kolom: ${menu.filterColumns}`);
      ln();
    }
    if (menu.hasExport) {
      ln(`**Export Data:** ${menu.exportFormats.join(", ")}`);
      ln();
    }
  }

  // ── Visual HTML Layout Template
  ln(`## Visual HTML Layout Template (DO NOT MODIFY STRUCTURE)`);
  ln(`AI WAJIB menggunakan struktur HTML dan CSS yang sudah dikompilasi secara visual oleh user berikut sebagai template utama untuk file \`index.html\`.`);
  ln(`Tugas Anda hanya menyisipkan logika interaksi (event listener, penanganan form, pengisian tabel, grafik) di dalam tag \`<script>\` yang tepat di dalam berkas HTML ini.`);
  ln();
  for (const menu of data.menus) {
    const rawThemeColor = data.colorTheme === "Custom hex" ? data.customColor : (promptThemeColors[data.colorTheme] || "#0d6efd");
    ln(`### Halaman/Menu: ${menu.name}`);
    ln(`Berikut adalah kode HTML layout untuk halaman ini:`);
    ln(`\`\`\`html`);
    ln(compileCanvasToHTML(menu, rawThemeColor));
    ln(`\`\`\``);
    ln();
  }

  // ── Frontend Requirements
  ln(`## Frontend (index.html) Requirements`);
  ln();
  ln(`- **Framework:** Bootstrap 5 (CDN: https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css)`);
  ln(`- **Icons:** Bootstrap Icons (CDN: https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css)`);
  ln(`- **Typography & Font Premium:**`);
  ln(`  - Gunakan Google Fonts. Impor font **'Plus Jakarta Sans'** (untuk teks biasa dan menu) dan **'Outfit'** (untuk headings/judul) di dalam tag \`<head>\`.`);
  ln(`  - Atur CSS global agar semua font default ter-override oleh font premium ini agar tampilan terasa sangat berkelas (tidak memakai font sistem default browser).`);
  ln(`- **Desain Premium & Visual Anti AI Slop (WAJIB DIIKUTI):**`);
  ln(`  - **Bukan Bootstrap Standar:** Jangan biarkan tampilan terkesan seperti template kaku bawaan Bootstrap.`);
  ln(`  - **Efek Glassmorphism & Soft Border:** Terapkan border tipis dan halus (\`border: 1px solid rgba(255, 255, 255, 0.08)\` jika mode gelap atau \`border: 1px solid rgba(0, 0, 0, 0.05)\` jika mode terang).`);
  ln(`  - **Bayangan Halus & Deep:** Gunakan bayangan yang lembut (\`box-shadow: 0 10px 30px -10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02)\`). Hindari shadow tebal hitam pekat.`);
  ln(`  - **Micro-Interactions & Animasi:** Berikan transisi halus (\`transition: all 0.2s ease-in-out\`) saat hover tombol, navigasi menu, dan baris tabel.`);
  ln(`  - **Form Input Modern:** Input field harus memiliki padding yang nyaman, latar belakang semi-transparan, border tipis, dan efek berpendar (glowing ring) lembut sesuai warna tema saat mendapatkan fokus.`);
  ln(`  - **Layout & Spacing Longgar:** Berikan padding dan margin (\`p-3\`, \`py-4\`, \`gap-3\`) yang cukup agar elemen tidak berdesak-desakan, sehingga aplikasi terasa bersih dan profesional.`);
  ln(`  - **Sidebar Navigasi:** Desain sidebar dengan background semi-transparan, border pemisah yang tipis, dan indikator aktif berbentuk pil atau gradien halus warna tema.`);

  const themeColors: Record<string, string> = {
    "Biru profesional": "#0d6efd (Primary Blue)",
    "Hijau segar": "#198754 (Success Green)",
    "Ungu modern": "#6f42c1 (Purple)",
    "Abu netral": "#6c757d (Gray)",
  };
  const themeColor = data.colorTheme === "Custom hex" ? data.customColor : (themeColors[data.colorTheme] || data.colorTheme);
  ln(`- **Tema Warna Utama:** ${data.colorTheme} → \`${themeColor}\` (gunakan variasi gradien dari warna ini untuk aksen, background active states, dan komponen utama).`);
  ln(`- **Layout Tabel:** ${data.tableLayout}`);
  ln(`- **Aturan Komunikasi Client-Server (PENTING):**`);
  ln(`  - **DILARANG** menggunakan \`fetch\`, \`axios\`, atau \`XMLHttpRequest\` untuk memanggil backend Apps Script (seperti memanggil web app URL / \`doGet\` endpoint).`);
  ln(`  - Semua pemanggilan fungsi dari HTML (\`index.html\`) ke backend (\`code.gs\`) **WAJIB** menggunakan \`google.script.run\` secara asinkron dengan handler sukses (\`.withSuccessHandler()\`) dan gagal (\`.withFailureHandler()\`).`);
  ln();

  ln(`### Komponen UI yang wajib ada:`);
  ln(`1. Navbar premium dengan logo aplikasi (gunakan ikon Apps Script ungu atau logo profesional lainnya), nama aplikasi "${data.appName}", dan penunjuk status login.`);
  ln(`2. Sidebar / Tab menu navigasi dengan hover state & active state yang jelas.`);
  for (let i = 0; i < data.menus.length; i++) {
    ln(`3. Halaman "${data.menus[i].name}" dengan layout tabel data modern (responsive) + tombol aksi CRUD (Edit/Hapus dengan ikon).`);
  }
  ln(`4. Modal form dengan input fields premium untuk operasi Create dan Update.`);
  ln(`5. Modal konfirmasi bergaya modern (bukan dialog default alert browser) untuk operasi Delete.`);
  ln(`6. Loading spinner (overlay transparan dengan spinner warna tema) untuk setiap proses pengiriman/pemuatan data ke server.`);
  ln(`7. Toast notification otomatis yang elegan di pojok kanan atas untuk sukses & error feedback.`);
  ln();

  if (data.hasLogin) {
    ln(`### Mekanisme Halaman Login & Validasi Akses (Premium UI):`);
    ln(`1. **Form Login Premium Custom:**`);
    ln(`   - Tampilkan Halaman Login minimalis bergaya glassmorphism di tengah layar jika pengguna belum login.`);
    ln(`   - Sediakan form input Username dan Password (bukan otomatis login dari Google).`);
    const rolesList = data.loginAccess ? data.loginAccess.split(",").map(r => r.trim()).filter(Boolean) : [];
    if (rolesList.length > 0) {
      ln(`   - Sediakan dropdown pilihan **Role** (Pilihan: ${rolesList.map(r => `"${r}"`).join(", ")}).`);
    }
    ln(`   - Tombol **"Masuk ke Aplikasi"** dengan visual loading spinner saat memverifikasi kredensial.`);
    ln(`2. **Proses Verifikasi Kredensial (Server-Side):**`);
    ln(`   - Ketika tombol login diklik, panggil server function \`loginUser(username, password, role)\`.`);
    ln(`   - Fungsi backend akan mencari baris yang cocok di \`Sheet_Users\` (username, password, dan role harus cocok).`);
    ln(`   - Jika cocok, simpan status sesi login di client-side (menggunakan \`localStorage\` atau \`sessionStorage\` seperti \`sessionUser = { username, role, nama_lengkap }\`).`);
    ln(`   - Sembunyikan form login and tampilkan dashboard utama aplikasi.`);
    ln(`3. **Pembatasan Akses Menu Berdasarkan Role (Role-based Access Control):**`);
    ln(`   - Navigasi menu utama harus mendeteksi role login pengguna.`);
    ln(`   - Sembunyikan tab menu tertentu jika role pengguna aktif tidak diizinkan mengakses menu tersebut (misal: menu tertentu hanya bisa diakses oleh role tertentu).`);
    ln(`4. **Tombol Keluar (Logout):**`);
    ln(`   - Sediakan tombol Logout di pojok kanan atas atau sidebar.`);
    ln(`   - Menghapus data session/localStorage pengguna dan memuat ulang halaman kembali ke form login.`);
    ln();
  }

  // ── Backend Requirements
  ln(`## Backend (code.gs) Requirements`);
  ln();
  ln(`### Functions yang WAJIB ada:`);
  ln();
  ln(`\`\`\`javascript`);
  ln(`// === Core Functions ===`);
  if (data.hasLogin) {
    ln(`function doGet() { /* serve HTML, pastikan memanggil initUserTable() untuk inisialisasi user */ }`);
  } else {
    ln(`function doGet() { /* serve HTML */ }`);
  }
  ln(`function include(filename) { /* include partial HTML */ }`);
  if (data.hasLogin) {
    ln(`function loginUser(username, password, role) { /* cari username, password, dan role yang cocok di Sheet_Users, return { success: true/false, user: { username, role, nama_lengkap } } */ }`);
    ln(`function initUserTable() { /* otomatis buat Sheet_Users dengan default akun admin jika belum ada. Default: username "admin", password "admin123", role "Admin", nama_lengkap "Administrator" */ }`);
  }
  ln();
  for (const sheet of data.sheets) {
    const s = sheet.sheetName.replace(/[^a-zA-Z0-9]/g, "_");
    ln(`// === ${sheet.sheetName} ===`);
    ln(`function getData_${s}(params) { /* ambil data dengan filter & pagination */ }`);
    ln(`function createData_${s}(payload) { /* tambah data baru + validasi */ }`);
    ln(`function updateData_${s}(id, payload) { /* update data */ }`);
    ln(`function deleteData_${s}(id) { /* hapus data */ }`);
    ln(`function searchData_${s}(query) { /* pencarian */ }`);
    ln();
  }
  ln(`\`\`\``);
  ln();

  ln(`### Format Return Value (WAJIB konsisten):`);
  ln(`\`\`\`javascript`);
  ln(`// Setiap function HARUS return object dengan format:`);
  ln(`{ success: true, data: [...], message: "Berhasil" }`);
  ln(`// atau jika error:`);
  ln(`{ success: false, error: "Pesan error", message: "Gagal" }`);
  ln(`\`\`\``);
  ln();

  ln(`### Validasi:`);
  for (const sheet of data.sheets) {
    ln(`- **${sheet.sheetName}:**`);
    for (const col of sheet.columns) {
      if (col.required) {
        ln(`  - \`${col.name}\` (${col.type}) — wajib diisi${col.note ? `, ${col.note}` : ""}`);
      }
    }
  }
  ln();

  ln(`### Error Handling:`);
  ln(`- Setiap function dibungkus try-catch`);
  ln(`- Log error ke console untuk debugging`);
  ln(`- Return format JSON konsisten (lihat di atas)`);
  ln(`- \`google.script.run\` SELALU gunakan \`.withSuccessHandler()\` dan \`.withFailureHandler()\``);
  ln();

  // ── Security
  ln(`## Security & Access`);
  ln();
  if (data.hasLogin) {
    ln(`- **Akses Dibatasi (Otentikasi Kredensial Spreadsheet & Role):** Ya`);
    ln(`- **Daftar Role Pengguna yang Didukung:** \`${data.loginAccess || "Admin, User"}\``);
    ln(`- **Langkah Keamanan Wajib:**`);
    ln(`  1. **Verifikasi Kredensial Server-Side:** Selalu validasi kecocokan username dan password langsung dari data baris \`Sheet_Users\` melalui Apps Script backend. Jangan pernah melakukan validasi password hardcoded di sisi HTML client-side.`);
    ln(`  2. **Validasi Sesi pada Operasi CRUD:** Setiap fungsi CRUD di backend (\`getData_\`, \`createData_\`, dll) harus menerima parameter username/role aktif dan melakukan pengecekan ulang apakah user tersebut memiliki hak akses yang valid sebelum memproses data Sheets.`);
    ln(`  3. **HINDARI Session.getActiveUser().getEmail():** JANGAN sekali-kali menggunakan \`Session.getActiveUser().getEmail()\` untuk mengidentifikasi pengguna atau membatasi akses di client-side maupun backend, karena aplikasi dideploy dengan akses "Anyone" (Siapa saja). Seluruh identifikasi user harus dilakukan melalui data username dari form login yang disimpan di client-side sessionStorage/localStorage.`);
    ln(`  4. **Metode Deploy Web App:** Tulis instruksi deploy agar pengguna mengatur konfigurasi deploy sebagai berikut:`);
    ln(`     - **Execute as:** \`Me\` (Saya)`);
    ln(`     - **Who has access:** \`Anyone\` (Siapa saja, termasuk pengguna tanpa login Google, karena verifikasi sudah ditangani oleh sistem login form kustom kita sendiri)`);
  } else {
    ln(`- **Akses:** Terbuka Bebas (Siapa saja dengan tautan dapat masuk)`);
    ln(`- **Metode Deploy Web App:**`);
    ln(`  - **Execute as:** \`Me\``);
    ln(`  - **Who has access:** \`Anyone\` (Siapa saja, termasuk pengguna tanpa login Google)`);
  }
  ln();

  // ── Email Notification
  if (data.hasEmailNotif) {
    ln(`## Email Notification`);
    ln(`- **Trigger:** ${data.emailTrigger}`);
    ln(`- Gunakan \`MailApp.sendEmail()\` untuk mengirim notifikasi`);
    ln();
  }

  // ── Extra Features
  if (data.extraFeatures.length > 0) {
    ln(`## Fitur Tambahan`);
    for (const f of data.extraFeatures) {
      ln(`- ✅ ${f}`);
    }
    ln();
  }

  // ── Step-by-Step Implementation Guide
  ln(`## Step-by-Step Implementation Guide`);
  ln(`1. Buat Google Spreadsheet baru`);
  ln(`2. Rename/buat sheet sesuai struktur di atas: ${data.sheets.map((s) => s.sheetName).join(", ")}`);
  ln(`3. Tambahkan header kolom di baris pertama setiap sheet (sesuai tabel di atas)`);
  ln(`4. Buka Extensions > Apps Script`);
  ln(`5. Buat file \`code.gs\` — paste semua kode backend`);
  ln(`6. Buat file \`index.html\` — paste semua kode frontend`);
  ln(`7. Deploy > New Deployment > Web App`);
  ln(`   - Execute as: **Me**`);
  ln(`   - Who has access: **Anyone** (atau sesuai aturan akses)`);
  ln(`8. Test semua operasi CRUD satu per satu`);
  ln(`9. Share URL deployment ke pengguna`);
  ln();

  // ── Anti-Error Checklist
  ln(`## Anti-Error Checklist`);
  ln(`- [ ] Semua nama Sheet di kode cocok PERSIS dengan nama sheet di Spreadsheet`);
  ln(`- [ ] Semua nama function di \`google.script.run\` cocok PERSIS dengan function di \`code.gs\``);
  ln(`- [ ] Setiap \`google.script.run\` menggunakan \`.withSuccessHandler()\` DAN \`.withFailureHandler()\``);
  ln(`- [ ] DILARANG KERAS menggunakan \`fetch\`, \`axios\`, atau \`XMLHttpRequest\` untuk memanggil backend Apps Script (seluruh data transfer harus lewat google.script.run).`);
  ln(`- [ ] Tidak ada operasi synchronous/blocking di client-side`);
  ln(`- [ ] Validasi dilakukan di KEDUA sisi (client + server)`);
  ln(`- [ ] UUID/ID generation menggunakan \`Utilities.getUuid()\``);
  ln(`- [ ] Column index dimulai dari 1 (bukan 0) di Apps Script`);
  ln(`- [ ] Semua data transfer menggunakan JSON (bukan object langsung)`);
  ln(`- [ ] Modal konfirmasi sebelum setiap operasi DELETE`);
  ln(`- [ ] Loading spinner ditampilkan saat menunggu response server`);
  ln(`- [ ] Error message ditampilkan jika operasi gagal`);

  return lines.join("\n");
}

export function compileFullHTMLStructure(data: WizardData): string {
  const themeColors: Record<string, string> = {
    "Biru profesional": "#0d6efd",
    "Hijau segar": "#198754",
    "Ungu modern": "#6f42c1",
    "Abu netral": "#6c757d",
  };
  const themeColor = data.colorTheme === "Custom hex" ? data.customColor : (themeColors[data.colorTheme] || "#0d6efd");

  let html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.appName}</title>
  
  <!-- CSS Framework & Icons -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css" rel="stylesheet">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <style>
    :root {
      --theme-color: ${themeColor};
      --theme-color-rgb: 13, 110, 253; /* Fallback */
      --font-family-base: 'Plus Jakarta Sans', sans-serif;
      --font-family-heading: 'Outfit', sans-serif;
    }
    
    body {
      font-family: var(--font-family-base);
      background-color: #f8f9fa;
      color: #333;
      overflow-x: hidden;
    }

    .Outfit-font, .font-heading, h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-family-heading);
    }

    /* Premium Theme Elements */
    .bg-theme-gradient {
      background: linear-gradient(135deg, var(--theme-color) 0%, #1e293b 100%);
    }

    /* Glassmorphism Styles */
    .glass-card {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 0, 0, 0.05);
      box-shadow: 0 10px 30px -10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02);
      border-radius: 16px;
      transition: all 0.25s ease-in-out;
    }

    .glass-card:hover {
      box-shadow: 0 15px 35px -5px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.03);
    }

    /* Sidebar Navigation */
    .sidebar {
      width: 260px;
      min-height: 100vh;
      background: #ffffff;
      border-right: 1px solid rgba(0, 0, 0, 0.05);
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.02);
      transition: all 0.3s ease;
      z-index: 100;
    }

    .nav-link-custom {
      font-weight: 500;
      color: #4b5563;
      padding: 12px 16px;
      border-radius: 12px;
      transition: all 0.2s ease;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }

    .nav-link-custom:hover {
      background-color: #f1f5f9;
      color: #0f172a;
    }

    .nav-link-custom.active {
      background-color: var(--theme-color);
      color: #ffffff !important;
      box-shadow: 0 4px 15px rgba(var(--theme-color-rgb), 0.3);
    }

    /* Main Content Wrapper */
    .content-area {
      flex: 1;
      padding: 30px;
      min-height: 100vh;
    }

    /* Inputs Styling */
    .form-control, .form-select {
      border: 1px solid #e2e8f0;
      padding: 11px 16px;
      border-radius: 10px;
      font-size: 14px;
      transition: all 0.2s ease-in-out;
    }

    .form-control:focus, .form-select:focus {
      border-color: var(--theme-color);
      box-shadow: 0 0 0 3px rgba(var(--theme-color-rgb), 0.15);
      outline: none;
    }

    /* Toast styling */
    .toast-premium {
      background-color: #ffffff;
      border-left: 4px solid var(--theme-color);
      border-radius: 12px;
    }

    /* Animation effects */
    .fade-in-section {
      animation: fadeIn 0.3s ease-in-out forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>

  <!-- LOADING OVERLAY -->
  <div id="loadingOverlay" class="position-fixed top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-dark bg-opacity-50 text-white d-none" style="z-index: 2000; backdrop-filter: blur(2px);">
    <div class="spinner-border text-light mb-2" role="status"></div>
    <span class="fw-semibold">Sedang diproses...</span>
  </div>

  <!-- TOAST NOTIFICATION -->
  <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1080;">
    <div id="appToast" class="toast border-0 shadow-lg toast-premium" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body fw-medium" id="toastMessage"></div>
        <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  </div>

  <!-- AUTH/LOGIN WRAPPER -->
  ${data.hasLogin ? `
  <div id="loginPage" class="position-fixed top-0 start-0 w-100 h-100 bg-light d-flex align-items-center justify-content-center" style="z-index: 1500;">
    <div class="card border-0 shadow-lg p-5 rounded-4" style="max-width: 400px; width: 100%;">
      <div class="text-center mb-4">
        <h3 class="fw-bold font-heading">${data.appName}</h3>
        <p class="text-muted">Silakan masuk menggunakan akun Anda</p>
      </div>
      <form id="loginForm">
        <div class="mb-3">
          <label class="form-label font-heading fw-semibold">Username</label>
          <input type="text" id="loginUsername" class="form-control" required placeholder="Masukkan username">
        </div>
        <div class="mb-3">
          <label class="form-label font-heading fw-semibold">Password</label>
          <input type="password" id="loginPassword" class="form-control" required placeholder="Masukkan password">
        </div>
        <button type="submit" class="btn w-100 py-2.5 text-white fw-bold shadow-sm" style="background-color: var(--theme-color)">Masuk</button>
      </form>
    </div>
  </div>
  ` : ''}

  <!-- MAIN APP SHELL -->
  <div class="d-flex" id="appShell">
    
    <!-- SIDEBAR -->
    <div class="sidebar d-flex flex-column shrink-0">
      <div class="p-4 bg-theme-gradient text-white d-flex align-items-center gap-2 mb-3">
        <i class="bi bi-cpu-fill fs-4"></i>
        <span class="fs-5 fw-bold font-heading truncate">${data.appName}</span>
      </div>
      
      <div class="flex-grow-1 px-3 overflow-y-auto">
        ${data.menus.map((menu, idx) => {
          const menuId = `menu_${menu.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
          // Map lucide icons to bootstrap icon names
          const bsIcons: Record<string, string> = {
            ClipboardList: "list-task",
            Users: "people",
            BarChart3: "graph-up",
            Package: "box",
            DollarSign: "currency-dollar",
            Calendar: "calendar",
            Bell: "bell",
            FileEdit: "pencil-square",
            Settings: "gear",
            Folder: "folder",
            TrendingUp: "arrow-up-right",
            Tag: "tag"
          };
          const icon = bsIcons[menu.icon] || "grid";

          return `
          <a href="#" class="nav-link-custom ${idx === 0 ? 'active' : ''}" id="nav_${menuId}" onclick="switchPage('${menuId}')">
            <i class="bi bi-${icon}"></i>
            <span>${menu.name}</span>
          </a>
          `;
        }).join('')}
      </div>

      ${data.hasLogin ? `
      <div class="p-3 border-t border-light">
        <button onclick="logoutUser()" class="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 rounded-3 py-2">
          <i class="bi bi-box-arrow-right"></i>
          <span>Keluar</span>
        </button>
      </div>
      ` : ''}
    </div>

    <!-- CONTENT PANEL -->
    <div class="content-area overflow-auto">
      
      <!-- HEADER BAR -->
      <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-light">
        <h4 class="mb-0 font-heading fw-bold" id="currentPageTitle">${data.menus[0]?.name || 'Beranda'}</h4>
        <div class="d-flex align-items-center gap-3">
          <span class="text-secondary small d-none d-sm-inline" id="userWelcome">Selamat datang</span>
          <div class="bg-light border rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
            <i class="bi bi-person fs-5"></i>
          </div>
        </div>
      </div>

      <!-- PAGES -->
      <div class="pages-container">
        ${data.menus.map((menu, idx) => {
          const menuId = `menu_${menu.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
          return `
          <div id="page_${menuId}" class="page-section fade-in-section ${idx === 0 ? '' : 'd-none'}">
            ${compileCanvasToHTML(menu, themeColor)}
          </div>
          `;
        }).join('')}
      </div>

    </div>
  </div>

  <!-- GLOBAL FORM MODAL (GENERIC CRUD) -->
  <div class="modal fade" id="formModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
        <form id="appForm">
          <div class="modal-header border-0 bg-light py-3 px-4">
            <h5 class="modal-title fw-bold font-heading" id="formModalTitle">Tambah Data</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4" id="formModalBody">
            <!-- Dynamic input components will be displayed/hidden here by client JS -->
          </div>
          <div class="modal-footer border-0 px-4 pb-4">
            <button type="button" class="btn btn-light rounded-3 px-4" data-bs-dismiss="modal">Batal</button>
            <button type="submit" class="btn text-white fw-bold rounded-3 px-4 shadow-sm" id="btnFormSubmit" style="background-color: var(--theme-color)">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- GLOBAL DELETE CONFIRMATION MODAL -->
  <div class="modal fade" id="deleteModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg rounded-4 text-center p-4">
        <div class="text-danger mb-3"><i class="bi bi-exclamation-triangle fs-1"></i></div>
        <h5 class="fw-bold font-heading mb-2">Hapus Data?</h5>
        <p class="text-muted small">Data yang dihapus tidak dapat dikembalikan lagi dari database.</p>
        <div class="d-flex gap-2 mt-3">
          <button type="button" class="btn btn-light flex-1 rounded-3" data-bs-dismiss="modal">Batal</button>
          <button type="button" class="btn btn-danger flex-1 rounded-3 fw-bold" id="btnConfirmDelete">Hapus</button>
        </div>
      </div>
    </div>
  </div>

  <!-- JS Scripts Framework -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
  
  <!-- INTERACTIVE JS CODE GENERATED BY AI -->
  <script>
    // System UI Helpers
    const showLoading = (show) => {
      document.getElementById('loadingOverlay').classList.toggle('d-none', !show);
    };

    const showToast = (message, success = true) => {
      const toastEl = document.getElementById('appToast');
      const toastMessage = document.getElementById('toastMessage');
      toastMessage.innerText = message;
      toastEl.style.borderLeftColor = success ? 'var(--theme-color)' : '#dc3545';
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    };

    const switchPage = (pageId) => {
      document.querySelectorAll('.page-section').forEach(p => p.classList.add('d-none'));
      document.querySelectorAll('.nav-link-custom').forEach(l => l.classList.remove('active'));
      
      const targetPage = document.getElementById('page_' + pageId);
      if (targetPage) targetPage.classList.remove('d-none');
      
      const targetLink = document.getElementById('nav_' + pageId);
      if (targetLink) targetLink.classList.add('active');
      
      // Update Title
      const linkText = targetLink ? targetLink.querySelector('span').innerText : '';
      document.getElementById('currentPageTitle').innerText = linkText;
    };

    // === PLACEHOLDER LOGIC: AI AKAN MENGISI SCRIPT INTERAKSI DI SINI ===
  </script>

</body>
</html>`;
  return html;
}
