// Mirrors server/_core/index.ts import order exactly to test whether
// ESM import hoisting causes ENV to capture empty values before dotenv runs.
import dotenv from "dotenv";
dotenv.config();
import { ENV } from "../server/_core/env";

console.log("ENV.jwtSecret:", ENV.jwtSecret ? `SET (${ENV.jwtSecret.length} chars)` : "EMPTY");
console.log(
  "process.env.JWT_SECRET:",
  process.env.JWT_SECRET ? `SET (${process.env.JWT_SECRET.length} chars)` : "EMPTY",
);
