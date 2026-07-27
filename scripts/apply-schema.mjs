import { readFileSync } from "node:fs";
import { Client } from "pg";

let connectionString =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("POSTGRES_URL_NON_POOLING não definido no ambiente.");
  process.exit(1);
}

// Força sslmode=no-verify (aceita o certificado self-signed do Supabase pooler).
connectionString = connectionString.replace(/([?&])sslmode=[^&]*/i, "$1sslmode=no-verify");
if (!/sslmode=/i.test(connectionString)) {
  connectionString += (connectionString.includes("?") ? "&" : "?") + "sslmode=no-verify";
}

const files = [
  "supabase/schema.sql",
  "supabase/schema_friends.sql",
  "supabase/schema_activities.sql",
];

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("[schema] conectado ao Postgres");

for (const file of files) {
  const sql = readFileSync(file, "utf8");
  console.log(`[schema] aplicando ${file} ...`);
  try {
    await client.query(sql);
    console.log(`[schema] OK: ${file}`);
  } catch (err) {
    console.error(`[schema] ERRO em ${file}: ${err.message}`);
  }
}

await client.end();
console.log("[schema] concluído");
