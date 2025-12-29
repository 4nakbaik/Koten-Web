## Instruksi

1.  **Clone Repository ini:**
    ```bash
    git clone https://github.com/4nakbaik/Koten-Web.git 
    cd Koten-web
    ```

2.  **Buat file `.env` di folder utama:**
    set env:
    ```env
    POSTGRES_USER=ujang
    POSTGRES_PASSWORD=pulangkesolo
    POSTGRES_DB=nama_db
    DB_PORT=5432
    SERVER_PORT=3000
    ```

3.  **Terakhir:**
    Buka terminal di folder proyek, trus ketik:
    ```bash
    docker-compose up --build
    ```

## Struktur Folder 
```
.
├── database/
│   └── init.sql
├── public/
│   ├── audio/
│   ├── data/
│   ├── image/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── server.js
├── docker-compose.yml
├── Dockerfile
├── package.json
└── .env
```


