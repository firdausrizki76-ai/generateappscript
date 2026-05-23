/* ─────────────────────────────────────────────
   Prompt Builder — generates plan.md from wizard data
   ───────────────────────────────────────────── */

import type { WizardData } from "./store";

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
