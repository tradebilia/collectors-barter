import mysql from "mysql2/promise";
import fs from "fs";
const url = fs.readFileSync(".env", "utf8").match(/DATABASE_URL="([^"]+)"/)[1];
const conn = await mysql.createConnection(url);
const [rows] = await conn.execute("SELECT title, grade, certificationCompany, `condition`, JSON_UNQUOTE(JSON_EXTRACT(itemDetails,'$.isGraded')) AS isGraded FROM listings WHERE isActive=1");
rows.forEach(r => console.log(`${r.title}: grade=${r.grade} certCo=${r.certificationCompany} condition=${r.condition} isGraded=${r.isGraded}`));
await conn.end();
