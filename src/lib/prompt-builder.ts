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
    if (sheet.autoCreatedBy) ln(`| createdBy | String | Ya | Auto: email user |`);
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
    ln(`1. **Proses Verifikasi Awal:** Saat halaman pertama kali dibuka, frontend harus langsung memanggil server function \`checkUserAccess()\` secara asinkron.`);
    ln(`2. **Shimmer / Loading Screen:** Selama proses pengecekan hak akses berlangsung, tampilkan layar pemuatan (loading screen) premium berskala penuh dengan animasi berdenyut (pulse) dan teks *"Memverifikasi identitas Anda..."*.`);
    ln(`3. **Halaman Akses Ditolak (Restricted Access Page):**`);
    ln(`   - Jika \`checkUserAccess()\` mengembalikan status tidak berizin (unauthorized):`);
    ln(`     - Sembunyikan seluruh struktur layout menu dan aplikasi utama secara permanen.`);
    ln(`     - Tampilkan sebuah kartu kaca (glassmorphism card) yang sangat menawan di tengah layar.`);
    ln(`     - Tampilkan ikon gembok besar (\`bi-shield-lock-fill\`) dengan efek pendar neon warna tema.`);
    ln(`     - Tampilkan judul *"Akses Ditolak / Terbatas"* dan keterangan bahwa akun Google aktif saat ini tidak terdaftar dalam whitelist.`);
    ln(`     - Tampilkan email aktif pengguna saat ini dengan jelas: *"Email aktif Anda saat ini: **[email-user]**"*.`);
    ln(`     - Tampilkan daftar email / domain yang diizinkan untuk masuk (jika diisi).`);
    ln(`     - Sediakan tombol **"Ganti Akun Google"** yang mengarahkan user ke URL logout / pemilih akun Google Google Accounts: \`https://accounts.google.com/AccountChooser?continue=\` + Web App URL, sehingga mereka bisa login dengan akun lain yang diizinkan.`);
    ln(`     - Sediakan tombol **"Minta Akses"** (mailto link ke admin atau petunjuk kontak) bagi pengguna baru.`);
    ln(`4. **Masuk Aplikasi:** Jika pengguna lolos validasi, sembunyikan loading screen dengan efek transisi fade-out dan tampilkan dashboard utama.`);
    ln();
  }

  // ── Backend Requirements
  ln(`## Backend (code.gs) Requirements`);
  ln();
  ln(`### Functions yang WAJIB ada:`);
  ln();
  ln(`\`\`\`javascript`);
  ln(`// === Core Functions ===`);
  ln(`function doGet() { /* serve HTML */ }`);
  ln(`function include(filename) { /* include partial HTML */ }`);
  if (data.hasLogin) {
    ln(`function checkUserAccess() { /* cek hak akses email aktif, return { success: true/false, email: ... } */ }`);
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
    ln(`- **Akses Dibatasi (Otentikasi Server-Side & Whitelist):** Ya`);
    ln(`- **Daftar Putih (Whitelist) Email / Domain yang Diizinkan:** \`${data.loginAccess || "Semua Akun Google (Tanpa domain khusus)"}\``);
    ln(`- **Langkah Keamanan Wajib:**`);
    ln(`  1. **Deteksi Email Server-Side:** Gunakan \`Session.getActiveUser().getEmail()\` untuk menangkap alamat email pengguna Google yang sedang aktif.`);
    ln(`  2. **Validasi Whitelist:**`);
    ln(`     - Bandingkan email aktif tersebut dengan daftar email/domain whitelist.`);
    ln(`     - Domain whitelist dicocokkan dengan mengecek apakah email berakhiran dengan nama domain tersebut (misal: \`@perusahaan.com\`).`);
    ln(`     - Lakukan pencocokan secara case-insensitive.`);
    ln(`  3. **Keamanan Setiap Fungsi CRUD:** Setiap fungsi CRUD di backend (\`getData_\`, \`createData_\`, \`updateData_\`, \`deleteData_\`) wajib memanggil fungsi verifikasi akses terlebih dahulu sebelum berinteraksi dengan Google Sheet. Jika akses tidak valid, langsung throw error atau return status gagal: \`{ success: false, error: "Akses Ditolak" }\`. Ini sangat penting untuk mencegah pemanggilan ilegal via browser console.`);
    ln(`  4. **Metode Deploy Web App (PENTING):** Tulis instruksi deploy agar pengguna mengatur konfigurasi deploy sebagai berikut:`);
    ln(`     - **Execute as:** \`Me\` (Saya)`);
    ln(`     - **Who has access:** \`Anyone with Google account\` (Siapa saja dengan akun Google)`);
    ln(`     - *Catatan: Jika dipilih 'Anyone' saja (tanpa Google account), email pengguna akan terdeteksi kosong/anonim di server-side, sehingga sistem pembatasan akses tidak dapat bekerja.*`);
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
