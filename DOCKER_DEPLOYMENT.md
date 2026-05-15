# Math Topic Classifier — Docker Deployment Guide

## 1. Proje Genel Bakış (Project Overview)

Math Topic Classifier, matematik sorularını otomatik olarak sınıflandıran bir yapay zekâ uygulamasıdır.
Uygulama üç ana servisten oluşur:

| Servis | Teknoloji | Port | Açıklama |
|--------|-----------|------|----------|
| **Database** | PostgreSQL 15 | 5432 | Kullanıcı verileri, oturum bilgileri ve sınıflandırma geçmişi |
| **Backend** | FastAPI (Python 3.11) | 8000 | REST API, model entegrasyonu, Google OAuth, iyzico ödeme |
| **Frontend** | React + Vite → Nginx | 80 | Kullanıcı arayüzü (SPA), API reverse proxy |

---

## 2. Mimari Diyagram (Architecture)

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Compose                            │
│                                                                  │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │  PostgreSQL  │◄───│  FastAPI Backend │◄───│ Nginx (React)   │  │
│  │  :5432       │    │  :8000          │    │  :80            │  │
│  │             │    │                 │    │                 │  │
│  │  • Users    │    │  • /predict     │    │  • Static SPA   │  │
│  │  • Sessions │    │  • /api/login   │    │  • Reverse Proxy │  │
│  │  • History  │    │  • /api/payment │    │  • Gzip          │  │
│  │  • Subs     │    │  • /health      │    │  • Caching       │  │
│  └─────────────┘    └─────────────────┘    └─────────────────┘  │
│       Volume:               Env vars:           Build:           │
│       pgdata                DATABASE_URL         npm run build   │
│                             ENDPOINT_URL                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Docker Dosyaları (Docker Files)

### 3.1 Backend Dockerfile (`frontend/Dockerfile`)

**Multi-stage build** kullanılmaktadır:

| Stage | Base Image | Amaç |
|-------|-----------|------|
| **Builder** | `python:3.11-slim` | Bağımlılıkları derlemek (gcc, libpq-dev) |
| **Runtime** | `python:3.11-slim` | Sadece çalışma zamanı dosyalarını kopyalamak |

**Güvenlik önlemleri:**
- Non-root `appuser` kullanıcısı ile çalışır
- `.env` dosyası kopyalanmaz (çevre değişkenleri Docker Compose'dan gelir)
- Health check ile container sağlığı izlenir

**Performans optimizasyonları:**
- `uvloop` + `httptools` ile yüksek performanslı async I/O
- 2 worker process ile paralel istek işleme

### 3.2 Frontend Dockerfile (`frontend/react-app/Dockerfile`)

| Stage | Base Image | Amaç |
|-------|-----------|------|
| **Builder** | `node:20-alpine` | React uygulamasını Vite ile derlemek |
| **Server** | `nginx:1.27-alpine` | Statik dosyaları sunmak + API proxy |

**Nginx yapılandırması:**
- Gzip sıkıştırma aktif
- Statik dosyalar 1 yıl cache'lenir (`immutable`)
- `/api/*`, `/predict`, `/auth/*` istekleri backend'e yönlendirilir
- SPA fallback: bilinmeyen route'lar `index.html`'e yönlendirilir

### 3.3 Docker Compose (`docker-compose.yml`)

Tüm servisleri bir arada orkestre eder:

```yaml
services:
  db:        # PostgreSQL — healthcheck ile hazırlık kontrolü
  backend:   # FastAPI — db'ye bağımlı, hazır olunca başlar
  frontend:  # Nginx — backend'e bağımlı, hazır olunca başlar
```

**Servis bağımlılık zinciri:**
```
db (healthy) → backend (healthy) → frontend
```

---

## 4. Çalıştırma Komutları (How to Run)

### Ön Koşullar
- Docker Desktop kurulu olmalı
- Proje kök dizininde terminal açılmalı

### Başlatma
```bash
# Tüm servisleri derle ve başlat
docker-compose up --build -d

# Servislerin durumunu kontrol et
docker-compose ps

# Logları izle
docker-compose logs -f
docker-compose logs -f backend    # Sadece backend logları
```

### Durdurma
```bash
# Servisleri durdur
docker-compose down

# Servisleri durdur ve veritabanı verisini sil
docker-compose down -v
```

### Erişim
- **Uygulama:** http://localhost (port 80)
- **Backend API:** http://localhost:8000
- **Health Check:** http://localhost:8000/health

---

## 5. Ortam Değişkenleri (Environment Variables)

| Değişken | Varsayılan | Açıklama |
|----------|-----------|----------|
| `DATABASE_URL` | Docker'da otomatik | PostgreSQL bağlantı URL'si |
| `ENDPOINT_URL` | Boş (demo mod) | HuggingFace Space model endpoint |
| `HF_TOKEN` | Boş | HuggingFace API token (özel Space'ler için) |
| `FRONTEND_URL` | `http://localhost` | OAuth redirect URL'leri için |
| `GOOGLE_CLIENT_ID` | Boş | Google OAuth istemci kimliği |
| `GOOGLE_CLIENT_SECRET` | Boş | Google OAuth gizli anahtarı |
| `IYZICO_API_KEY` | Boş | iyzico ödeme API anahtarı |
| `IYZICO_SECRET_KEY` | Boş | iyzico gizli anahtar |
| `IYZICO_BASE_URL` | `sandbox-api.iyzipay.com` | iyzico API adresi |

---

## 6. Güvenlik Önlemleri (Security)

1. **Non-root container**: Backend `appuser` olarak çalışır
2. **Çevre değişkenleri**: Hassas bilgiler `.env` dosyasından, kod içine gömülmez
3. **CORS politikası**: Sadece izin verilen origin'lerden istek kabul edilir
4. **Health check**: Container sağlığı otomatik izlenir, sorunlu container yeniden başlatılır
5. **`.dockerignore`**: `.env`, `__pycache__`, `.git` gibi hassas/gereksiz dosyalar image'a dahil edilmez

---

## 7. Production vs Development Karşılaştırması

| Özellik | Development (Lokal) | Production (Docker) |
|---------|--------------------|--------------------|
| Frontend sunucu | Vite dev server (:3000) | Nginx (:80) |
| API proxy | Vite proxy (`vite.config.js`) | Nginx reverse proxy |
| Veritabanı | Lokal PostgreSQL | Containerized PostgreSQL |
| Hot reload | ✅ Aktif | ❌ (yeniden build gerekir) |
| Performans | Geliştirme modu | Optimized, gzip, cache |
| Güvenlik | Gevşek | Non-root, CORS, healthcheck |

---

## 8. Sorun Giderme (Troubleshooting)

```bash
# Container loglarını kontrol et
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Container'a bağlan
docker-compose exec backend bash
docker-compose exec db psql -U math_user -d math_classifier_db

# Yeniden build et
docker-compose up --build -d --force-recreate
```
