"""
RSA encryption module for CypherFlux.
"""
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization

class RSAModule:
    def __init__(self):
        self.private_key = None
        self.public_key = None

    def generate_keys(self):
        """Generate a new RSA key pair."""
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        self.public_key = self.private_key.public_key()
        return self.private_key, self.public_key

    def encrypt(self, data, public_key=None):
        """Encrypt data using a public key."""
        key = public_key or self.public_key
        if not key:
            raise ValueError("Public key required for encryption")
        
        return key.encrypt(
            data.encode() if isinstance(data, str) else data,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )

    def decrypt(self, ciphertext, private_key=None):
        """Decrypt data using a private key."""
        key = private_key or self.private_key
        if not key:
            raise ValueError("Private key required for decryption")

        return key.decrypt(
            ciphertext,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        ).decode()
