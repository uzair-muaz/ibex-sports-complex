# Staging server — nginx, SSL, and PM2

Host: `staging.ibexsportscomplex.com`  
App directory: `/home/ubuntu/ibex-sports-complex`  
Process name: `ibex-staging-next`  
App bind: port `3000` (nginx on 80/443 proxies to it)  
Public ports: **80** and **443**, open to all clients (no IP allow/deny rules)

Google OAuth (already set in Google Cloud Console):

- Origin: `https://staging.ibexsportscomplex.com`
- Redirect: `https://staging.ibexsportscomplex.com/api/auth/callback/google`

## Environment

`.env.local` is loaded by `next start`. These values point at staging:

| Variable | Value |
| --- | --- |
| `APP_URL` | `https://staging.ibexsportscomplex.com` |
| `NEXTAUTH_URL` | `https://staging.ibexsportscomplex.com` |
| `AUTH_URL` | `https://staging.ibexsportscomplex.com` |
| `AUTH_TRUST_HOST` | `true` |
| `API_CORS_ORIGINS` | `https://staging.ibexsportscomplex.com` |

Do not commit `.env.local`. Secrets stay in that file only.

## Nginx

Site file: `/etc/nginx/sites-available/staging.ibexsportscomplex.com`  
Enabled link: `/etc/nginx/sites-enabled/staging.ibexsportscomplex.com`

Nginx accepts every source address, terminates TLS, and reverse-proxies to PM2. Forwarded headers (`Host`, `X-Forwarded-Proto`, `X-Forwarded-For`) are set so NextAuth sees `https`.

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name staging.ibexsportscomplex.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type "text/plain";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        client_max_body_size 25m;
    }
}
```

The live file differs from the block above after the certificate was issued:

- A `listen 443 ssl` server uses the Let's Encrypt certificate and proxies to the app with `X-Forwarded-Proto: https`.
- The port 80 server redirects to HTTPS, except when Cloudflare already sent `X-Forwarded-Proto: https` (Cloudflare "Flexible" mode). Those requests are proxied directly, which prevents a redirect loop. A `map $http_x_forwarded_proto $ibex_client_proto` at the top of the file drives this.
- `/.well-known/acme-challenge/` stays on port 80 for renewals.

Backup of the Certbot-generated version: `/etc/nginx/sites-available/staging.ibexsportscomplex.com.bak`.

Check and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx
```

Logs:

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## TLS

Certificate is issued by Let's Encrypt (Certbot nginx plugin) for `staging.ibexsportscomplex.com`.

Issue (once ports 80/443 are reachable from the internet):

```bash
sudo certbot --nginx -d staging.ibexsportscomplex.com --non-interactive --agree-tos --register-unsafely-without-email --redirect
```

Renewal is on a systemd timer:

```bash
systemctl status certbot.timer
sudo certbot renew --dry-run
sudo certbot certificates
```

Certificate files (typical paths):

- `/etc/letsencrypt/live/staging.ibexsportscomplex.com/fullchain.pem`
- `/etc/letsencrypt/live/staging.ibexsportscomplex.com/privkey.pem`

The DNS name is proxied by Cloudflare (public A records are Cloudflare anycast addresses). In Cloudflare:

- SSL/TLS mode: **Full (strict)** recommended (encrypts Cloudflare → server). "Flexible" also works with this nginx config.
- Origin record: this server's public IPv4 (`3.80.70.239`)
- AWS security group `launch-wizard-1` must allow inbound **TCP 80** and **TCP 443** from `0.0.0.0/0` (and IPv6 `::/0` if used). The host firewall (ufw) is inactive, so it does not block traffic. If Cloudflare returns a timeout or error 522, the security group is still dropping packets.

## PM2

Config file: `/home/ubuntu/ibex-sports-complex/ecosystem.config.cjs`

The running process was started with:

```bash
cd /home/ubuntu/ibex-sports-complex
npm run build
pm2 start npm --name ibex-staging-next -- start
pm2 save
```

Equivalent using the config file (binds to 127.0.0.1 only):

```bash
pm2 delete ibex-staging-next
pm2 start ecosystem.config.cjs
pm2 save
```

Stop, start, and restart:

```bash
pm2 stop ibex-staging-next
pm2 start ibex-staging-next
pm2 restart ibex-staging-next
```

Status:

```bash
pm2 status
pm2 describe ibex-staging-next
```

Logs (live follow, last lines, and log files):

```bash
pm2 logs ibex-staging-next
pm2 logs ibex-staging-next --lines 200
pm2 flush ibex-staging-next
```

Log files:

- `/home/ubuntu/.pm2/logs/ibex-staging-next-out.log`
- `/home/ubuntu/.pm2/logs/ibex-staging-next-error.log`

Boot persistence is enabled (systemd unit `pm2-ubuntu`). After changing the process list, run `pm2 save` so the new list is restored on reboot.

```bash
systemctl status pm2-ubuntu
pm2 save
```

## Deploy again

```bash
cd /home/ubuntu/ibex-sports-complex
git pull
npm ci
npm run build
pm2 restart ibex-staging-next
```

Rebuild is required after code changes. Restart is enough after `.env.local` changes that are read at runtime. Change `NEXT_PUBLIC_*` variables only with a rebuild (none are set for this app today).
