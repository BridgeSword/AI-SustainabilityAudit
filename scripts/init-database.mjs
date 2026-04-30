import pg from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { STSClient, AssumeRoleWithWebIdentityCommand } from "@aws-sdk/client-sts";

const { Client } = pg;

async function getAwsCredentials() {
  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  if (!oidcToken) {
    console.log("No OIDC token found, using default AWS credentials");
    return null;
  }

  const stsClient = new STSClient({ region: process.env.AWS_REGION });
  const command = new AssumeRoleWithWebIdentityCommand({
    RoleArn: process.env.AWS_ROLE_ARN,
    RoleSessionName: "aurora-init-session",
    WebIdentityToken: oidcToken,
  });

  const response = await stsClient.send(command);
  return response.Credentials;
}

async function generateAuthToken(credentials) {
  const signer = new Signer({
    hostname: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || "5432"),
    username: process.env.PGUSER || "postgres",
    region: process.env.AWS_REGION,
    ...(credentials && {
      credentials: {
        accessKeyId: credentials.AccessKeyId,
        secretAccessKey: credentials.SecretAccessKey,
        sessionToken: credentials.SessionToken,
      },
    }),
  });

  return signer.getAuthToken();
}

async function initDatabase() {
  console.log("Initializing Aurora PostgreSQL database...");
  console.log("Host:", process.env.PGHOST);
  console.log("Database:", process.env.PGDATABASE);
  console.log("User:", process.env.PGUSER);
  console.log("Region:", process.env.AWS_REGION);

  const credentials = await getAwsCredentials();
  const password = await generateAuthToken(credentials);

  const client = new Client({
    host: process.env.PGHOST,
    port: parseInt(process.env.PGPORT || "5432"),
    database: process.env.PGDATABASE || "postgres",
    user: process.env.PGUSER || "postgres",
    password: password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to Aurora PostgreSQL");

    // Create tables
    const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
      );

      -- Companies table
      CREATE TABLE IF NOT EXISTS companies (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          sector TEXT,
          country TEXT,
          created_at TIMESTAMP DEFAULT NOW()
      );

      -- Reports table
      CREATE TABLE IF NOT EXISTS reports (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          company_id INTEGER REFERENCES companies(id),
          year INTEGER NOT NULL,
          extracted_json JSONB NOT NULL DEFAULT '{}',
          extraction_status TEXT DEFAULT 'pending',
          scoring_status TEXT DEFAULT 'pending',
          anomaly_status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
      );

      -- Metrics table
      CREATE TABLE IF NOT EXISTS metrics (
          id SERIAL PRIMARY KEY,
          report_id INTEGER REFERENCES reports(id),
          metric_name TEXT NOT NULL,
          raw_value FLOAT,
          normalized_value FLOAT,
          unit TEXT,
          source TEXT DEFAULT 'extracted',
          created_at TIMESTAMP DEFAULT NOW()
      );

      -- Report text table (without vector for now - pgvector may not be available)
      CREATE TABLE IF NOT EXISTS report_text (
          report_id INTEGER PRIMARY KEY REFERENCES reports(id),
          full_text TEXT
      );

      -- LLM scores table
      CREATE TABLE IF NOT EXISTS llm_scores (
          id SERIAL PRIMARY KEY,
          report_id INTEGER REFERENCES reports(id),
          metric_name TEXT,
          standard_name TEXT,
          score FLOAT,
          explanation TEXT,
          created_at TIMESTAMP DEFAULT NOW()
      );

      -- Anomaly results table
      CREATE TABLE IF NOT EXISTS anomaly_results (
          id SERIAL PRIMARY KEY,
          report_id INTEGER REFERENCES reports(id),
          model_name TEXT,
          anomaly_score FLOAT,
          is_anomaly BOOLEAN,
          created_at TIMESTAMP DEFAULT NOW()
      );

      -- Peer rankings table
      CREATE TABLE IF NOT EXISTS peer_rankings (
          id SERIAL PRIMARY KEY,
          company_id INTEGER REFERENCES companies(id),
          year INTEGER,
          method TEXT,
          rank INTEGER,
          score FLOAT,
          created_at TIMESTAMP DEFAULT NOW()
      );

      -- Time series table
      CREATE TABLE IF NOT EXISTS time_series (
          id SERIAL PRIMARY KEY,
          company_id INTEGER REFERENCES companies(id),
          metric_name TEXT,
          year INTEGER,
          value FLOAT
      );

      -- PDF files table
      CREATE TABLE IF NOT EXISTS pdf_files (
          id SERIAL PRIMARY KEY,
          report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
          uploaded_by INTEGER REFERENCES users(id),
          filename TEXT NOT NULL,
          mime_type TEXT NOT NULL DEFAULT 'application/pdf',
          file_size_bytes BIGINT,
          sha256 TEXT,
          content_blob BYTEA NOT NULL,
          is_public BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await client.query(schema);
    console.log("Tables created successfully");

    // Create indexes
    const indexes = `
      CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_reports_company ON reports(company_id);
      CREATE INDEX IF NOT EXISTS idx_metrics_report ON metrics(report_id);
      CREATE INDEX IF NOT EXISTS idx_time_series_company_metric ON time_series(company_id, metric_name);
      CREATE INDEX IF NOT EXISTS idx_pdf_files_report ON pdf_files(report_id);
      CREATE INDEX IF NOT EXISTS idx_pdf_files_uploader ON pdf_files(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_pdf_files_sha256 ON pdf_files(sha256);
    `;

    await client.query(indexes);
    console.log("Indexes created successfully");

    // Insert a default user if none exists
    const userResult = await client.query("SELECT COUNT(*) FROM users");
    if (parseInt(userResult.rows[0].count) === 0) {
      await client.query(
        "INSERT INTO users (email) VALUES ($1)",
        ["default@example.com"]
      );
      console.log("Default user created");
    }

    // Verify tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log("Created tables:", tablesResult.rows.map(r => r.table_name).join(", "));

    console.log("Database initialization complete!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  } finally {
    await client.end();
  }
}

initDatabase().catch(console.error);
