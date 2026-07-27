import { Client } from "pg";
let cs = (process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL).replace(
  /([?&])sslmode=[^&]*/i,
  "$1sslmode=no-verify"
);
if (!/sslmode=/i.test(cs)) cs += (cs.includes("?") ? "&" : "?") + "sslmode=no-verify";
const c = new Client({ connectionString: cs });
await c.connect();
const t = await c.query(
  "select tablename from pg_tables where schemaname='public' order by tablename"
);
console.log("Tabelas:", t.rows.map((r) => r.tablename).join(", "));
const f = await c.query(
  "select proname from pg_proc where pronamespace='public'::regnamespace order by proname"
);
console.log("Funções:", f.rows.map((r) => r.proname).join(", "));
await c.end();
