# Koten

Koten adalah aplikasi web full-stack yang dirancang untuk membantu pembelajaran kosakata bahasa Jepang. Aplikasi ini menggabungkan metode Spaced Repetition System (SRS), modul ujian interaktif, dan mode permainan arcade untuk meningkatkan retensi kosakata pengguna secara efektif.

## Fitur Utama

* **Sistem Flashcard (SRS):** Algoritma cerdas yang memprioritaskan kata-kata yang sulit diingat oleh pengguna untuk memaksimalkan efisiensi belajar.
* **Mode Ujian (Exam):** Simulasi tes dengan batasan waktu untuk mengukur kemampuan mengingat kosakata dalam kondisi tertekan.
* **Mode Arcade:** Modul pembelajaran gamifikasi dengan antarmuka retro untuk meningkatkan keterlibatan pengguna.
* **Pelacakan Statistik:** Dasbor analitik yang menampilkan tingkat penguasaan materi (Mastery Level), total XP, dan riwayat belajar.
* **Sinkronisasi Multi-Perangkat:** Penyimpanan progres belajar berbasis identifikasi perangkat (Device ID), memungkinkan akses berkelanjutan tanpa login tradisional.

## Arsitektur Teknologi

Aplikasi ini dibangun menggunakan arsitektur modern berbasis microservices yang dikemas dalam Docker container.

### Frontend
* **React (Vite):** Framework UI untuk performa tinggi dan pengalaman pengguna yang responsif.
* **Tailwind CSS:** Framework styling untuk desain antarmuka yang konsisten.
* **Framer Motion:** Library untuk transisi antarmuka yang halus.

### Backend
* **Node.js & Express:** Server API yang menangani logika bisnis dan komunikasi data.
* **PostgreSQL:** Basis data relasional untuk menyimpan data pengguna, kosakata, dan log aktivitas.

### Infrastruktur
* **Docker & Docker Compose:** Orkestrasi kontainer untuk memastikan konsistensi lingkungan pengembangan dan produksi.

## Prasyarat Instalasi

Sebelum menjalankan aplikasi, pastikan perangkat lunak berikut telah terinstal:
1. Docker Desktop
2. Git

## Panduan Instalasi dan Menjalankan

Ikuti langkah-langkah berikut untuk menjalankan proyek di lingkungan lokal Anda.

### 1. Clone Repository
Unduh kode sumber proyek ke komputer lokal Anda.

```bash
git clone [https://github.com/USERNAME_ANDA/NAMA_REPO.git](https://github.com/USERNAME_ANDA/NAMA_REPO.git)
cd NAMA_REPO
