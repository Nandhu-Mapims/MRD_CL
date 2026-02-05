# Production deployment (Hostinger VPS – checklist.mapims.edu.in)

## 1. Environment variables

Set these **on the VPS** (e.g. in a `.env` file in the project root) or in **Hostinger Container Environment** so they are available when running `docker-compose` and inside the backend container.

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** | Secret for JWT signing (e.g. `openssl rand -base64 32`). |
| `MONGO_ROOT_PASSWORD` | **Yes** | MongoDB root password (must match `MONGO_INITDB_ROOT_PASSWORD` used by the mongodb container). |
| `MONGO_ROOT_USERNAME` | No | MongoDB root user (default: `admin`). |
| `MONGO_DATABASE` | No | Database name (default: `mrd_audit`). |

- Backend **does not** load `.env` in production (`NODE_ENV=production`). It reads only `process.env` (set by Docker / Hostinger).
- `MONGO_URI` is built in `docker-compose.prod.yml` from the variables above. To use an external MongoDB, set `MONGO_URI` in the backend service environment instead.

## 2. Hostinger: where to set variables

- **If you run `docker-compose` on the VPS over SSH:** create a `.env` in the project root (copy from `env.example`) and set `JWT_SECRET` and `MONGO_ROOT_PASSWORD`. Do not commit `.env`.
- **If you use Hostinger’s Docker/Container UI:** in the backend container’s environment, set at least:
  - `JWT_SECRET`
  - `MONGO_URI` = `mongodb://admin:YOUR_PASSWORD@mongodb:27017/mrd_audit?authSource=admin`  
  (and ensure the mongodb service uses the same password in `MONGO_INITDB_ROOT_PASSWORD`).

## 3. SSL certificates

Place your SSL certificate and key so nginx can read them:

- Certificate: `nginx/ssl/cert.pem`
- Private key: `nginx/ssl/key.pem`

Create the directory if needed:

```bash
mkdir -p nginx/ssl
# Copy or generate cert.pem and key.pem into nginx/ssl/
```

## 4. Redeploy steps (on the VPS)

1. **SSH into the Hostinger VPS** and go to the project directory:
   ```bash
   cd /path/to/MRD_CL
   ```

2. **Create or update `.env`** (if not using Hostinger env UI):
   ```bash
   cp env.example .env
   # Edit .env and set JWT_SECRET and MONGO_ROOT_PASSWORD
   ```

3. **Pull latest code** (if using git):
   ```bash
   git pull
   ```

4. **Build and start the production stack:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

5. **Check that containers are up:**
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

6. **Check backend logs** (ensure MongoDB connection and no “JWT_SECRET is not set”):
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f backend
   ```
   You should see: `Attempting to connect to MongoDB at mongodb://admin:****@mongodb:27017/...` and `MongoDB connected successfully`.

7. **Check nginx:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs nginx
   ```

8. **Test in browser:**  
   https://checklist.mapims.edu.in  
   Log in and confirm API calls work (no CORS or 503 errors).

## 5. Rollback

```bash
docker-compose -f docker-compose.prod.yml down
# Restore previous code or config, then:
docker-compose -f docker-compose.prod.yml up -d --build
```

## 6. Security checklist

- [ ] `JWT_SECRET` is long and random; not committed.
- [ ] `MONGO_ROOT_PASSWORD` is strong; not committed.
- [ ] `.env` is in `.gitignore` and not deployed to the repo.
- [ ] SSL is used (HTTPS); certificates are in `nginx/ssl/` and not committed.
- [ ] Backend uses only `process.env` in production (no `.env` file dependency).
