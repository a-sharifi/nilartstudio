from redis import Redis

from nilart.contexts.identity.infrastructure.secrets import token_digest


def csrf_attempt_allowed(redis_url: str, address: str) -> bool:
    cache = Redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
    try:
        count = cache.eval(
            "local n=redis.call('INCR',KEYS[1]); if n==1 then "
            "redis.call('EXPIRE',KEYS[1],300) end; return n",
            1, "auth:csrf:" + token_digest(address))
        return int(count) <= 60
    finally:
        cache.close()


def password_attempt_allowed(redis_url: str, phone: str, address: str) -> bool:
    cache = Redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
    try:
        counts = []
        for prefix, value in [("phone", phone), ("address", address)]:
            count = cache.eval(
                "local n=redis.call('INCR',KEYS[1]); if n==1 then "
                "redis.call('EXPIRE',KEYS[1],300) end; return n",
                1, "auth:password:" + prefix + ":" + token_digest(value))
            counts.append(int(count))
        return counts[0] <= 10 and counts[1] <= 60
    finally:
        cache.close()


def otp_attempt_allowed(redis_url: str, action: str, phone: str, address: str) -> bool:
    limits = {"request": (5, 30, 3600), "verify": (30, 60, 300), "complete": (10, 30, 300)}
    phone_limit, address_limit, window = limits[action]
    cache = Redis.from_url(redis_url, socket_connect_timeout=2, socket_timeout=2)
    try:
        counters = [("address", address, address_limit)]
        if phone:
            counters.append(("phone", phone, phone_limit))
        allowed = True
        for prefix, value, limit in counters:
            count = cache.eval(
                "local n=redis.call('INCR',KEYS[1]); if n==1 then "
                "redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
                1, f"auth:otp:{action}:{prefix}:" + token_digest(value), window)
            allowed = int(count) <= limit and allowed
        return allowed
    finally:
        cache.close()
