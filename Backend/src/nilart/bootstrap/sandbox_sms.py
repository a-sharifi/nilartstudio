"""Read an expiring local sandbox OTP through an explicit operator command."""
import argparse
import json

from redis import Redis

from nilart.bootstrap.settings import settings
from nilart.contexts.identity.domain.rules import normalize_phone
from nilart.contexts.identity.infrastructure.secrets import token_digest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--phone", required=True)
    args = parser.parse_args()
    if settings.environment != "development" or settings.sms_mode != "sandbox":
        parser.error("Sandbox SMS is not enabled")
    cache = Redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
    try:
        entry = cache.get("sandbox:sms:" + token_digest(normalize_phone(args.phone)))
        if not entry:
            parser.exit(2, "No unexpired sandbox message.\n")
        message = json.loads(entry)
        print("SANDBOX " + message["purpose"] + ": " + message["code"])
    finally:
        cache.close()


if __name__ == "__main__":
    main()
