FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile

# 8080 = plain HTTP (typical, TLS terminated in front)
# 80/443 = automatic HTTPS if SITE_ADDRESS is a domain
EXPOSE 8080 80 443
