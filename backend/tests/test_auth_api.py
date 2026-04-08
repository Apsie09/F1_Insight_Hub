from __future__ import annotations

import os
import tempfile
import unittest

from fastapi.testclient import TestClient


TEST_DIR = tempfile.mkdtemp(prefix="f1_auth_tests_")
TEST_DB_PATH = os.path.join(TEST_DIR, "auth_test.sqlite3")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["F1_SERVING_MODE"] = "db"
os.environ["F1_ENABLE_LEGACY_FALLBACK"] = "false"

import init_db  # noqa: E402
import main  # noqa: E402
from database import SessionLocal  # noqa: E402
from models import AppUser  # noqa: E402


class AuthApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        init_db.main()
        cls.client = TestClient(main.app)

    def test_register_and_login_round_trip(self) -> None:
        register_payload = {
            "email": "pitwall@example.com",
            "password": "RaceControl!2026",
            "displayName": "Pit Wall",
        }
        register_response = self.client.post("/auth/register", json=register_payload)
        self.assertEqual(register_response.status_code, 201)

        register_body = register_response.json()
        self.assertIn("token", register_body)
        self.assertEqual(register_body["user"]["email"], "pitwall@example.com")
        self.assertEqual(register_body["user"]["displayName"], "Pit Wall")

        login_response = self.client.post(
            "/auth/login",
            json={"email": register_payload["email"], "password": register_payload["password"]},
        )
        self.assertEqual(login_response.status_code, 200)
        login_body = login_response.json()
        self.assertIn("token", login_body)
        self.assertEqual(login_body["user"]["email"], "pitwall@example.com")

    def test_register_rejects_duplicate_email(self) -> None:
        payload = {
            "email": "duplicate@example.com",
            "password": "Duplicate!2026",
            "displayName": "Duplicate",
        }
        first = self.client.post("/auth/register", json=payload)
        self.assertEqual(first.status_code, 201)

        second = self.client.post("/auth/register", json=payload)
        self.assertEqual(second.status_code, 409)
        self.assertIn("already exists", second.json()["detail"])

    def test_login_rejects_invalid_password(self) -> None:
        payload = {
            "email": "invalidpass@example.com",
            "password": "CorrectPass!2026",
            "displayName": "Invalid Password User",
        }
        register_response = self.client.post("/auth/register", json=payload)
        self.assertEqual(register_response.status_code, 201)

        failed_login = self.client.post(
            "/auth/login",
            json={"email": payload["email"], "password": "wrong-password"},
        )
        self.assertEqual(failed_login.status_code, 401)

    def test_password_is_stored_hashed(self) -> None:
        payload = {
            "email": "hashcheck@example.com",
            "password": "HashCheck!2026",
            "displayName": "Hash Check",
        }
        register_response = self.client.post("/auth/register", json=payload)
        self.assertEqual(register_response.status_code, 201)

        with SessionLocal() as session:
            user = session.query(AppUser).filter(AppUser.email == payload["email"]).one_or_none()
            self.assertIsNotNone(user)
            assert user is not None
            self.assertNotEqual(user.password_hash, payload["password"])
            self.assertTrue(user.password_hash.startswith("$argon2"))


if __name__ == "__main__":
    unittest.main()
