##instruksi

### 1. Clone Repository

```bash
git clone origin https://github.com/4nakbaik/Koten-Web.git  
cd NAMA_REPO

### 2. Konfigurasi Environment (.env)
Buat file baru bernama .env 

# Konfigurasi Database misal. PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=rahasia
POSTGRES_DB=nama_db

# Konfigurasi Aplikasi
PORT=3000
DB_HOST=db
DB_PORT=5432

### 3. Buka Docker
run:

```bash
docker-compose up --build

### Struktur Folder

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
