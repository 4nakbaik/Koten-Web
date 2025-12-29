# Koten 📚✨

Selamat datang di **Koten**! Aplikasi web kece buat kamu yang lagi berjuang naklukin kosakata bahasa Jepang. Gak cuma sekadar flashcard biasa, di sini kamu bisa belajar sambil main game retro, ujian kayak beneran, dan pantau progress belajar kamu biar makin semangat jadi wibu elit! 🎌

## Fitur Unggulan 🔥

* **Flashcard Pintar (SRS):** Kartu hafalan yang bakal sering munculin kata-kata yang susah kamu inget. Jadi belajarnya lebih efisien, gak cuma ngulang yang udah hafal.
* **Arcade Mode:** Belajar rasa main game! Jawab pertanyaan sambil dikejar waktu dengan nuansa retro 8-bit yang asik. 🎮
* **Exam Mode:** Siap ujian? Tes kemampuan kamu di sini. Ada timernya lho, jadi berasa kayak lagi ujian JLPT beneran. 📝
* **Multi-Device Sync:** Login gak pake ribet! Progress kamu kesimpen otomatis berdasarkan device. Bisa lanjut belajar di HP atau Laptop tanpa takut data ilang. 📱💻
* **Stats & Chart:** Pantau level kamu, total XP, dan seberapa banyak kata yang udah kamu kuasai lewat grafik yang enak dilihat. 📈

## Teknologi di Balik Layar 🛠️

Aplikasi ini dibangun pake teknologi kekinian biar performanya ngebut dan stabil:

* **Frontend:** React (Vite) + Tailwind CSS (Biar tampilannya *sleek* & *responsive*)
* **Backend:** Node.js + Express (Otaknya aplikasi ini)
* **Database:** PostgreSQL (Buat nyimpen semua data hafalan kamu dengan aman)
* **Deploy:** Docker (Biar gampang dijalankan di mana aja tanpa drama "kok di laptop gue jalan, di sini enggak?") 🐳

## Cara Menjalankan (Lokal) 🚀

Mau coba jalanin di komputer sendiri? Gampang banget! Pastikan kamu udah install **Docker** dan **Node.js** ya.

1.  **Clone Repository ini:**
    ```bash
    git clone [https://github.com/USERNAME_KAMU/NAMA_REPO_KAMU.git](https://github.com/USERNAME_KAMU/NAMA_REPO_KAMU.git)
    cd NAMA_REPO_KAMU
    ```

2.  **Buat file `.env` di folder utama:**
    Isinya kayak gini (bisa disesuaikan):
    ```env
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=passwordrahasia
    POSTGRES_DB=nihongo_db
    DB_PORT=5432
    SERVER_PORT=3000
    ```

3.  **Nyalakan Mesin:**
    Buka terminal di folder proyek, trus ketik:
    ```bash
    docker-compose up --build
    ```

4.  **Buka di Browser:**
    * Frontend (Tampilan): Buka `http://localhost:5173`
    * Backend (API): Jalan di `http://localhost:3000`

## Struktur Folder 📂

Biar gak bingung, ini peta singkat kodingannya:

* **`client/`**: Isinya kodingan React buat tampilan web (Frontend).
* **`server/`**: Isinya kodingan Node.js buat ngurusin logika dan database (Backend).
* **`database/`**: Isinya script SQL buat bikin tabel database otomatis pas pertama kali jalan.
* **`docker-compose.yml`**: Resep rahasia buat nge-link Frontend, Backend, dan Database jadi satu kesatuan yang harmonis.

## Lisensi 📄

Proyek ini open source kok! Bebas dipake buat belajar atau dikembangin lagi. *Happy coding & Ganbatte!* 💪
