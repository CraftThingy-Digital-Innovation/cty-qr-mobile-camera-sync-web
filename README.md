# @craftthingy-digital-innovation/cty-qr-mobile-camera-sync-web

Library client-side Javascript untuk melakukan sinkronisasi penangkapan kamera HP (melalui scan QR Code) secara persisten dan instan ke layar komputer (PC) secara real-time tanpa perlu menginstal aplikasi native (cukup menggunakan web browser biasa).

Sangat cocok digunakan untuk sistem input data paspor, KTP, dokumen fisik, bukti penyerahan barang, tanda tangan, ataupun sistem OCR yang memerlukan pemrosesan multi-foto berturut-turut.

---

## Fitur Utama

- 📸 **Persistent Camera Session:** Sambungan kamera HP tetap aktif setelah memotret. Kamera secara otomatis di-reset dalam delay tertentu agar pengguna dapat mengambil foto berikutnya tanpa memindai QR Code ulang.
- 🔄 **Multi-photo & Background Queue Support:** Mendukung penerimaan dan pemrosesan antrean banyak foto secara latar belakang di PC.
- ⚡ **Real-Time Polling & Connection Status:** Mengirimkan detak jantung (heartbeat/ping) dari HP sehingga PC dapat memantau status koneksi kamera secara real-time.
- 🛠 **Dual Entry Point:** Menyediakan entry point modular terpisah untuk PC Client (`/`) dan Mobile Client (`/mobile`).

---

## Lisensi

Proyek ini dilisensikan di bawah **Public-Source Corporate Royalty License (PSCRL)**. Gratis sepenuhnya untuk penggunaan non-komersil, personal, akademis, dan proyek open-source. Penggunaan oleh entitas bisnis/komersial dikenakan royalti 1% jika pendapatan kotor tahunan telah melampaui $10,000 USD. Selengkapnya lihat file [LICENSE](./LICENSE).

---

## Instalasi

```bash
npm install @craftthingy-digital-innovation/cty-qr-mobile-camera-sync-web
```

---

## Cara Penggunaan

### 1. Inisialisasi Sisi Klien PC (Frontend PC)

Impor class `QrMobileSync` dari library utama untuk membuat sesi baru, mendapatkan URL QR Code, dan mendengarkan pengiriman gambar secara asinkron.

```javascript
import { QrMobileSync } from '@craftthingy-digital-innovation/cty-qr-mobile-camera-sync-web';

// Inisialisasi
const sync = new QrMobileSync({
  apiUrl: 'https://aplikasi-anda.com/api', // Endpoint server API Anda
  pollInterval: 2000 // Interval pooling ke server (default: 2000ms)
});

// Dapatkan token sesi aktif
const sessionToken = sync.sessionToken;

// Dapatkan URL tujuan yang akan disematkan ke dalam QR Code
const qrUrlForMobile = sync.getQrUrl('https://aplikasi-anda.com/mobile-camera');

// Render `qrUrlForMobile` ke elemen gambar QR Code (bisa menggunakan library qr-code eksternal)
renderQrCode(qrUrlForMobile);

// Mulai polling server
sync.startPolling();

// Tangkap perubahan status koneksi HP
sync.on('connection-change', ({ connected }) => {
  if (connected) {
    console.log("Kamera HP terhubung!");
  } else {
    console.log("Kamera HP terputus.");
  }
});

// Tangkap setiap gambar baru yang terkirim
sync.on('image', ({ filename, imageUrl }) => {
  console.log("Gambar diterima di PC:", imageUrl);
  
  // Tambahkan gambar ke viewport atau antrean lokal PC Anda
  displayImageInQueue(imageUrl);
  
  // Rekomendasi: Hapus file temporary di server agar hemat memori & tidak terproses ulang
  sync.clearFile(filename);
});

// Tangkap error jika terjadi gangguan jaringan
sync.on('error', (err) => {
  console.error("Terjadi error sinkronisasi:", err);
});
```

### 2. Inisialisasi Sisi Klien HP (Mobile Web Page)

Pada halaman mobile scanner (`mobile-camera`), gunakan entry point `/mobile` untuk mengakses hardware kamera dan mengupload gambar langsung ke PC.

```javascript
import { MobileCameraScanner } from '@craftthingy-digital-innovation/cty-qr-mobile-camera-sync-web/mobile';

// Ambil token dari parameter query URL (?token=xxxx)
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

const scanner = new MobileCameraScanner({
  token: token,
  uploadUrl: 'https://aplikasi-anda.com/api/ocr-phone/upload',
  pingUrl: 'https://aplikasi-anda.com/api/ocr-phone/ping',
  autoResetDelay: 2500 // Kamera aktif kembali 2.5 detik setelah berhasil upload
});

// Jalankan preview webcam
const videoElement = document.getElementById('camera-preview');
scanner.startCamera(videoElement);

// Kirim heartbeat status aktif ke server agar PC tahu HP sedang terhubung
scanner.startPing();

// Tombol Ambil Foto
document.getElementById('capture-btn').addEventListener('click', async () => {
  const canvas = document.createElement('canvas');
  try {
    const result = await scanner.captureAndUpload(canvas);
    console.log("Gambar sukses diupload ke server!", result);
  } catch (err) {
    console.error("Gagal mengupload gambar:", err);
  }
});

// Tangani event pemrosesan upload
scanner.on('upload-start', () => {
  showSpinner();
});

scanner.on('upload-success', () => {
  hideSpinner();
  showSuccessOverlay();
  
  // Kamera otomatis siap memotret kembali setelah `autoResetDelay`
  setTimeout(() => {
    hideSuccessOverlay();
  }, scanner.autoResetDelay);
});
```

---

## Struktur API Backend yang Diperlukan

Agar library ini dapat berkomunikasi, server backend Anda harus mendukung endpoint berikut:

### 1. Polling Status Kamera (`GET /ocr-phone/check/:token`)
Mengembalikan status koneksi HP dan daftar file terunggah.
**Response JSON:**
```json
{
  "status": "success",
  "connected": true,
  "images": [
    {
      "filename": "paspor_1.jpg",
      "image_url": "https://aplikasi-anda.com/uploads/ocr_temp/paspor_1.jpg"
    }
  ]
}
```

### 2. Ping Heartbeat HP (`GET /ocr-phone/ping/:token`)
Memperbarui timestamp aktivitas HP agar status `connected` bernilai `true`.

### 3. Upload Gambar (`POST /ocr-phone/upload/:token`)
Menerima file gambar berformat `multipart/form-data` dengan nama field `image`.

### 4. Clear File (`GET/DELETE /ocr-phone/clear-file/:filename`)
Menghapus file temporary tertentu di server demi privasi data dan efisiensi penyimpanan server.
