// Global test setup: load environment variables from .env so tests that
// exercise database-backed code paths (requireDb) have a valid DATABASE_URL.
// Tests that must not touch the real database should mock ./db explicitly.
import dotenv from "dotenv";

dotenv.config();
