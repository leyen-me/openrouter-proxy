FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /usr/local/bin/openrouter-proxy-entrypoint
RUN chmod +x /usr/local/bin/openrouter-proxy-entrypoint

# 8080 = plain HTTP (typical, TLS terminated in front)
# 80/443 = automatic HTTPS if SITE_ADDRESS is a domain
EXPOSE 8080 80 443

ENTRYPOINT ["openrouter-proxy-entrypoint"]
CMD ["run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
