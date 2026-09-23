#!/bin/sh
set -e

# Fail fast instead of silently becoming an open relay.
if [ -z "${PROXY_SECRET:-}" ]; then
	echo "FATAL: PROXY_SECRET is required and must be non-empty." >&2
	exit 1
fi

exec caddy "$@"
