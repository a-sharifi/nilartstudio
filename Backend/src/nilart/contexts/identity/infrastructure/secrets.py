import base64
import hashlib
import hmac
import secrets

from nilart.contexts.identity.domain.rules import validate_password

SCRYPT_N = 2**15
SCRYPT_R = 8
SCRYPT_P = 1


def hash_password(password: str) -> str:
    validate_password(password)
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R,
                            p=SCRYPT_P, dklen=32, maxmem=64 * 1024 * 1024)
    return "scrypt$32768$8$1$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def verify_password(password: str, encoded: str) -> bool:
    if len(password) > 128 or len(password.encode()) > 512:
        return False
    try:
        algorithm, n, r, p, salt, expected = encoded.split("$")
        # Persisted parameters are allowlisted to bound work and prevent memory abuse.
        if (algorithm, n, r, p) != ("scrypt", "32768", "8", "1"):
            return False
        salt_bytes = base64.b64decode(salt, validate=True)
        expected_bytes = base64.b64decode(expected, validate=True)
        if len(salt_bytes) != 16 or len(expected_bytes) != 32:
            return False
        digest = hashlib.scrypt(password.encode(), salt=salt_bytes, n=SCRYPT_N,
                                r=SCRYPT_R, p=SCRYPT_P, dklen=32, maxmem=64 * 1024 * 1024)
        return hmac.compare_digest(digest, expected_bytes)
    except (ValueError, TypeError):
        return False


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def otp_digest(*, key: bytes, challenge_id: str, purpose: str, code: str) -> str:
    if len(key) < 32:
        raise ValueError("OTP HMAC key must contain at least 32 bytes")
    return hmac.new(key, f"{challenge_id}:{purpose}:{code}".encode(), hashlib.sha256).hexdigest()


def new_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"
