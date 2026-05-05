import { neon } from "@neondatabase/serverless";

export default async function handler(req: any, res: any) {
  if (req.method !== "DELETE") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return res.status(500).json({
        ok: false,
        error: "DATABASE_URL is not configured",
      });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        ok: false,
        error: "id is required",
      });
    }

    const sql = neon(databaseUrl);

    const deleted = await sql`
      DELETE FROM demo_reports
      WHERE id = ${id}
      RETURNING *
    `;

    return res.status(200).json({
      ok: true,
      deleted: deleted[0] || null,
    });
  } catch (error: any) {
    console.error("Failed to delete report:", error);

    return res.status(500).json({
      ok: false,
      error: "Failed to delete report",
      detail: error.message,
    });
  }
}
