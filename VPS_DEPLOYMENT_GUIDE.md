# RACCOON APP - Ubuntu VPS Deployment Guide

## 1. Install system packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl build-essential python3.11 python3.11-venv python3-pip certbot python3-certbot-nginx
```

## 2. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
```

## 3. Copy project to server

```bash
sudo mkdir -p /var/www/raccoon
sudo chown -R $USER:$USER /var/www/raccoon
cd /var/www/raccoon
```

Copy your exported source into this directory.

## 4. Frontend build

```bash
cd /var/www/raccoon/frontend
yarn install
yarn build
```

## 5. Backend setup

```bash
cd /var/www/raccoon
python3.11 -m venv venv
source venv/bin/activate
cd backend
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

## 6. Backend env file

Create `/var/www/raccoon/backend/.env`.

Use the checklist in `/app/ENV_VARIABLES_CHECKLIST.md`.

## 7. Test backend locally

```bash
cd /var/www/raccoon/backend
source /var/www/raccoon/venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001
```

Check:

```bash
curl http://127.0.0.1:8001/api/health
```

## 8. systemd service

Create `/etc/systemd/system/raccoon-backend.service`:

```ini
[Unit]
Description=Raccoon FastAPI Backend
After=network.target

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

Enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable raccoon-backend
sudo systemctl start raccoon-backend
sudo systemctl status raccoon-backend
```

## 9. Nginx config

Create `/etc/nginx/sites-available/raccoon`:

```nginx
server {
    listen 80;
    server_name raccoon.co.com www.raccoon.co.com;

    root /var/www/raccoon/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    location /api/socket.io/ {
        proxy_pass http://127.0.0.1:8001/api/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/raccoon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 10. Point DNS to VPS

At your DNS provider:
- A record for `raccoon.co.com` -> your VPS public IP
- Optional `www` CNAME -> `raccoon.co.com`

## 11. Issue SSL certificate

After DNS points correctly:

```bash
sudo certbot --nginx -d raccoon.co.com -d www.raccoon.co.com
```

## 12. Post-deploy checks

- [ ] `https://raccoon.co.com` loads
- [ ] `https://raccoon.co.com/api/health` returns healthy
- [ ] Socket.IO connects on `/api/socket.io`
- [ ] MongoDB reachable from backend
- [ ] Firebase Google login authorized for new domain
- [ ] Stripe webhook URLs updated if Stripe is kept
- [ ] CORS locked down from `*`
- [ ] TURN server planned or configured for production reliability

## 13. Recommended cleanup after migration

- remove Emergent-specific scripts and deps if no longer needed
- rotate all secrets
- fix Stripe checkout path if premium sales are needed
- fix `/api/auth/google` server-side token verification
- fix missing `/api/payments/status/{sessionId}` route or remove `PremiumSuccess` polling
