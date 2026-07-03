# cty-qr-mobile-camera-sync-web

Bilingual documentation: [Bahasa Indonesia](#bahasa-indonesia) | [English](#english)

---

## Bahasa Indonesia

Library client-side Javascript untuk melakukan sinkronisasi penangkapan kamera HP (melalui scan QR Code) secara persisten dan instan ke layar komputer (PC) secara real-time tanpa perlu menginstal aplikasi native (cukup menggunakan web browser biasa).

Sangat cocok digunakan untuk sistem input data paspor, KTP, dokumen fisik, bukti penyerahan barang, tanda tangan, ataupun sistem OCR yang memerlukan pemrosesan multi-foto berturut-turut.

### Fitur Utama
- 📸 **Persistent Camera Session:** Sambungan kamera HP tetap aktif setelah memotret. Kamera secara otomatis di-reset dalam delay tertentu agar pengguna dapat mengambil foto berikutnya tanpa memindai QR Code ulang.
- 🔄 **Multi-photo & Background Queue Support:** Mendukung penerimaan dan pemrosesan antrean banyak foto secara latar belakang di PC.
- ⚡ **Real-Time Polling & Connection Status:** Mengirimkan detak jantung (heartbeat/ping) dari HP sehingga PC dapat memantau status koneksi kamera secara real-time.
- 🛠 **Dual Entry Point:** Menyediakan entry point modular terpisah untuk PC Client (`/`) dan Mobile Client (`/mobile`).

### Lisensi
Proyek ini dilisensikan di bawah **Public-Source Corporate Royalty License (PSCRL)**. Gratis sepenuhnya untuk penggunaan non-komersil, personal, akademis, dan proyek open-source. Penggunaan oleh entitas bisnis/komersial dikenakan royalti 1% jika pendapatan kotor tahunan telah melampaui $10,000 USD. Selengkapnya lihat file [LICENSE](./LICENSE).

---

### Cara Penggunaan (Bahasa Indonesia)

#### 1. Instalasi
```bash
npm install @craftthingy-digital-innovation/cty-qr-mobile-camera-sync-web
```

#### 2. Implementasi Sisi PC Client (Frontend PC)
Impor class `QrMobileSync` dari library utama untuk membuat sesi baru, mendapatkan URL QR Code, dan mendengarkan pengiriman gambar secara asinkron.

```javascript
import { QrMobileSync } from '@craftthingy-digital-innovation/cty-qr-mobile-camera-sync-web';

// Inisialisasi SDK
const sync = new QrMobileSync({
  apiUrl: 'https://aplikasi-anda.com/api', // Endpoint server API Anda
  pollInterval: 2000 // Interval pooling ke server (default: 2000ms)
});

// Dapatkan token sesi aktif
const sessionToken = sync.sessionToken;

// Dapatkan URL tujuan yang akan disematkan ke dalam QR Code
// Contoh: halaman kamera HP Anda berada di https://aplikasi-anda.com/mobile-camera
const qrUrlForMobile = sync.getQrUrl('https://aplikasi-anda.com/mobile-camera');

// Render `qrUrlForMobile` ke elemen gambar QR Code (menggunakan library qr-code eksternal Anda)
renderQrCode(qrUrlForMobile);

// Mulai polling server secara asinkron
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
  
  // Rekomendasi: Hapus file temporary di server agar hemat penyimpanan
  sync.clearFile(filename);
});

// Tangkap error jika terjadi gangguan jaringan
sync.on('error', (err) => {
  console.error("Terjadi error sinkronisasi:", err);
});
```

#### 3. Implementasi Sisi Kamera HP (Mobile Web Page)
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

#### 4. Struktur API Backend yang Diperlukan
Agar library ini dapat berkomunikasi, server backend Anda harus mendukung endpoint berikut:

##### A. Polling Status Kamera (`GET /ocr-phone/check/:token`)
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

##### B. Ping Heartbeat HP (`GET /ocr-phone/ping/:token`)
Memperbarui timestamp aktivitas HP agar status `connected` bernilai `true`.

##### C. Upload Gambar (`POST /ocr-phone/upload/:token`)
Menerima file gambar berformat `multipart/form-data` dengan nama field `image`.

##### D. Clear File (`GET/DELETE /ocr-phone/clear-file/:filename`)
Menghapus file temporary tertentu di server demi privasi data dan efisiensi penyimpanan server.

---

## English

A client-side JavaScript library to sync mobile camera captures (via scanning a QR Code) persistently and instantly to a computer (PC) screen in real-time, without installing any native applications (runs on standard mobile browsers).

Perfect for passport/ID document data input systems, physical receipts, delivery verification, signatures, or OCR engines requiring rapid multi-photo background queues.

### Key Features
- 📸 **Persistent Camera Session:** The mobile camera stream remains open after capture. The shutter resets automatically after a configurable delay so users can take the next photo without scanning the QR Code again.
- 🔄 **Multi-photo & Background Queue Support:** Supports receiving and handling multiple image queues concurrently on the PC side.
- ⚡ **Real-Time Polling & Connection Status:** Sends heartbeat/ping signals from the mobile browser to allow the PC client to display real-time connection status.
- 🛠 **Dual Entry Point:** Offers separate modular bundles for the PC Client (`/`) and Mobile Client (`/mobile`).

### Licensing
This project is licensed under the **Public-Source Corporate Royalty License (PSCRL)**. Completely free for non-commercial, personal, academic, and open-source projects. For-profit/commercial corporate usage requires a 1% royalty agreement once gross annual revenue exceeds $10,000 USD. For details, refer to the [LICENSE](./LICENSE) file.

---

### Usage Guide (English)

#### 1. Installation
```bash
npm install @craftthingy-digital-innovation/cty-qr-mobile-camera-sync-web
```

#### 2. PC Client Implementation (Frontend PC)
Import the `QrMobileSync` class to initiate sessions, generate QR target URLs, and listen for incoming images.

```javascript
import { QrMobileSync } from '@craftthingy-digital-innovation/cty-qr-mobile-camera-sync-web';

// Initialize SDK
const sync = new QrMobileSync({
  apiUrl: 'https://your-app.com/api', // Your backend server API base URL
  pollInterval: 2000 // Interval for server polling (default: 2000ms)
});

// Retrieve the active session token
const sessionToken = sync.sessionToken;

// Build the target mobile URL containing the session token
// For example, if your mobile camera page is hosted at https://your-app.com/mobile-camera
const qrUrlForMobile = sync.getQrUrl('https://your-app.com/mobile-camera');

// Render the `qrUrlForMobile` into a QR Code image (using your own external QR renderer library)
renderQrCode(qrUrlForMobile);

// Start async server polling
sync.startPolling();

// Listen for connection status updates
sync.on('connection-change', ({ connected }) => {
  if (connected) {
    console.log("Mobile camera connected!");
  } else {
    console.log("Mobile camera disconnected.");
  }
});

// Listen for incoming images
sync.on('image', ({ filename, imageUrl }) => {
  console.log("Image received on PC:", imageUrl);
  
  // Append the received image URL to your local PC workspace gallery or queue
  displayImageInQueue(imageUrl);
  
  // Recommended: Clear the temporary server file to save disk space
  sync.clearFile(filename);
});

// Listen for connection or sync errors
sync.on('error', (err) => {
  console.error("Sync error occurred:", err);
});
```

#### 3. Mobile Camera Implementation (Mobile Web Page)
On your mobile web page (`mobile-camera`), import the helper SDK from `/mobile` to control hardware camera devices and post captures.

```javascript
import { MobileCameraScanner } from '@craftthingy-digital-innovation/cty-qr-mobile-camera-sync-web/mobile';

// Parse session token from query parameters (?token=xxxx)
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

const scanner = new MobileCameraScanner({
  token: token,
  uploadUrl: 'https://your-app.com/api/ocr-phone/upload',
  pingUrl: 'https://your-app.com/api/ocr-phone/ping',
  autoResetDelay: 2500 // Camera automatically resets 2.5s after successful upload
});

// Bind to video element for webcam preview
const videoElement = document.getElementById('camera-preview');
scanner.startCamera(videoElement);

// Start sending heartbeat signals to the backend
scanner.startPing();

// Capture shutter button
document.getElementById('capture-btn').addEventListener('click', async () => {
  const canvas = document.createElement('canvas');
  try {
    const result = await scanner.captureAndUpload(canvas);
    console.log("Image successfully uploaded!", result);
  } catch (err) {
    console.error("Upload failed:", err);
  }
});

// Listen for upload progress/status
scanner.on('upload-start', () => {
  showSpinner();
});

scanner.on('upload-success', () => {
  hideSpinner();
  showSuccessOverlay();
  
  // The camera resets and is ready for the next capture automatically after `autoResetDelay`
  setTimeout(() => {
    hideSuccessOverlay();
  }, scanner.autoResetDelay);
});
```

#### 4. Required Backend API Schema
To establish communication, your backend server must provide the following HTTP endpoints:

##### A. Fetch Camera Status (`GET /ocr-phone/check/:token`)
Returns the active connection status and any pending uploaded images.
**Response JSON:**
```json
{
  "status": "success",
  "connected": true,
  "images": [
    {
      "filename": "passport_1.jpg",
      "image_url": "https://your-app.com/uploads/ocr_temp/passport_1.jpg"
    }
  ]
}
```

##### B. Mobile Heartbeat Ping (`GET /ocr-phone/ping/:token`)
Updates the last active timestamp for the session, marking `connected` as `true` in the PC check endpoint.

##### C. Post Shutter Capture (`POST /ocr-phone/upload/:token`)
Accepts file uploads as `multipart/form-data` under the field key `image`.

##### D. Clean Server Storage (`GET/DELETE /ocr-phone/clear-file/:filename`)
Deletes specific temporary image files on the server to enforce data privacy and optimize server storage space.
