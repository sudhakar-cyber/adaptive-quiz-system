"""
Password hashing for accounts managed inside MySQL.

Passwords are never stored in plain text. A hash looks like:

    pbkdf2_sha256$120000$<salt-hex>$<hash-hex>
"""

import hashlib
import hmac
import os
from typing import Optional

ALGORITHM = "pbkdf2_sha256"
DEFAULT_ITERATIONS = 120000


def hash_password(password: str, iterations: int = DEFAULT_ITERATIONS) -> str:
    """Returns a salted PBKDF2 hash for the given plain text password."""
    if not password:
        raise ValueError("Password cannot be empty")
    salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"{ALGORITHM}${iterations}${salt.hex()}${derived.hex()}"


def verify_password(password: str, stored_hash: Optional[str]) -> bool:
    """Constant time comparison of a plain text password against a stored hash."""
    if not password or not stored_hash:
        return False
    try:
        algorithm, iterations, salt_hex, hash_hex = stored_hash.split("$")
        if algorithm != ALGORITHM:
            return False
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iterations),
        )
    except (ValueError, AttributeError):
        return False
    return hmac.compare_digest(derived.hex(), hash_hex)
