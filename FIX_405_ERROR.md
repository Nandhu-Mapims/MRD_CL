# Fix for 405 Error on Login

## 🔍 Problem

The frontend was getting **405 (Method Not Allowed)** errors when trying to login because:

1. **Frontend** runs on `http://localhost:3000`
2. **Backend API** runs on `http://localhost:5000`
3. Frontend makes requests to `/api/auth/login` (relative path)
4. Browser sends request to `http://localhost:3000/api/auth/login` ❌
5. Frontend nginx doesn't know how to handle `/api` requests → 405 error

## ✅ Solution Applied

Added **API proxy configuration** to frontend nginx to forward `/api` requests to the backend:

```nginx
# API proxy - forward API requests to backend
location /api {
    proxy_pass http://backend:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

## 🔄 How It Works Now

1. Browser makes request: `POST http://localhost:3000/api/auth/login`
2. Frontend nginx receives request on port 3000
3. Nginx sees `/api` path and proxies to `http://backend:5000/api/auth/login`
4. Backend processes the request and returns response
5. Nginx forwards response back to browser ✅

## ✅ Status

- ✅ Frontend nginx configured with API proxy
- ✅ Frontend container rebuilt
- ✅ Frontend restarted with new configuration

## 🧪 Test

Try logging in again at http://localhost:3000/login

The 405 error should be resolved! 🎉
