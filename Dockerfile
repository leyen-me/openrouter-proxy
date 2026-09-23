FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile

# 8080 = plain HTTP; 80/443 = automatic HTTPS when SITE_ADDRESS is a domain
EXPOSE 8080 80 443
