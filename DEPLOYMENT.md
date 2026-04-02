# RACCOON APP - Production Deployment Configuration
# Optimized for Hostinger VPS deployment

## Server Requirements
- Node.js 18+ or 20+
- Python 3.11+
- MongoDB 7.0+
- Nginx (reverse proxy)
- SSL Certificate (Let's Encrypt)

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017/raccoon_app
DB_NAME=raccoon_app
JWT_SECRET_KEY=your-production-secret-key-min-32-chars
FIREBASE_API_KEY=your-firebase-key
STRIPE_SECRET_KEY=your-stripe-live-key
NODE_ENV=production
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://your-domain.com
REACT_APP_SOCKET_URL=https://your-domain.com
NODE_ENV=production
```

## Build Commands

### Frontend Production Build
```bash
cd frontend
yarn build
```

### Backend Production Run
```bash
cd backend
gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001 --timeout 60 --keep-alive 5
```

## Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 256;

    # Static files (React build)
    location / {
        root /var/www/raccoon/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket settings
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Socket.IO specific path
    location /api/socket.io/ {
        proxy_pass http://127.0.0.1:8001/api/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Low latency settings
        proxy_buffering off;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

## Systemd Service (backend)
```ini
[Unit]
Description=Raccoon App Backend
After=network.target mongodb.service

[Service]
User=www-data
WorkingDirectory=/var/www/raccoon/backend
Environment="PATH=/var/www/raccoon/venv/bin"
ExecStart=/var/www/raccoon/venv/bin/gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8001 --timeout 60
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Performance Optimizations Applied

### Frontend
- Lazy loading for all page components
- Image compression (5MB -> 0.33MB)
- Font display swap for faster rendering
- Reduced star animations for smoother UX
- WebSocket prefer websocket transport

### Backend
- GZip compression for all responses
- Connection pooling (50 max)
- Non-blocking database initialization
- Local MongoDB fallback
- Optimized Socket.IO settings (ping_interval=10s)

### WebRTC
- Lower video resolution for speed (640x480)
- Reduced ICE candidate pool (5)
- Faster connection timeout (15s)
- Optimized frame rate (24fps)

## TURN Server Recommendation
For production, use a dedicated TURN server:
- Coturn (self-hosted)
- Twilio Network Traversal Service
- Xirsys

## Monitoring
- Add PM2 or similar process manager
- Set up health check endpoint monitoring
- Configure error logging to external service

## Estimated Performance
- Page load: < 2 seconds
- API response: < 100ms
- WebSocket latency: < 50ms
- WebRTC connection: < 5 seconds
