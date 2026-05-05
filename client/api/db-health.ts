import { neon } from "@neondatabase/serverless";

export default async function handler(req: any, res: any) {
  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return res.status(500).json({
        ok: false,
        error: "DATABASE_URL is not configured",
      });
    }

    const sql = neon(databaseUrl);

    const result = await sql`
      SELECT 
        now() AS current_time,
        current_database() AS database_name
    `;

    return res.status(200).json({
      ok: true,
      message: "Neon database connection successful",
      data: result[0],
    });
  } catch (error: any) {
    console.error("Database health check failed:", error);

    return res.status(500).json({
      ok: false,
      error: "Database connection failed",
      detail: error.message,
    });
  }
}
