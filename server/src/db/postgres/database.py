import os
from urllib.parse import quote_plus
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Aurora PostgreSQL IAM Authentication
def _get_aws_credentials() -> dict:
    """Exchange Vercel's OIDC token for temporary AWS credentials."""
    import boto3
    oidc_token = os.environ.get("VERCEL_OIDC_TOKEN")
    if not oidc_token:
        return None
    
    sts = boto3.client("sts", region_name=os.environ["AWS_REGION"])
    resp = sts.assume_role_with_web_identity(
        RoleArn=os.environ["AWS_ROLE_ARN"],
        RoleSessionName="aurora-fastapi-session",
        WebIdentityToken=oidc_token,
    )
    return resp["Credentials"]


def _generate_auth_token() -> str:
    """Generate IAM auth token for Aurora PostgreSQL."""
    import boto3
    creds = _get_aws_credentials()
    if creds:
        client = boto3.client(
            "rds",
            region_name=os.environ["AWS_REGION"],
            aws_access_key_id=creds["AccessKeyId"],
            aws_secret_access_key=creds["SecretAccessKey"],
            aws_session_token=creds["SessionToken"],
        )
    else:
        # Local development fallback - use default credentials
        client = boto3.client("rds", region_name=os.environ.get("AWS_REGION", "us-east-1"))
    
    return client.generate_db_auth_token(
        DBHostname=os.environ["PGHOST"],
        Port=5432,
        DBUsername=os.environ.get("PGUSER", "postgres"),
    )


def _get_database_url() -> str:
    """Build database URL with IAM auth or fallback to password auth."""
    # Check if Aurora IAM auth is configured
    if os.environ.get("PGHOST") and os.environ.get("AWS_REGION"):
        try:
            password = _generate_auth_token()
            host = os.environ["PGHOST"]
            user = os.environ.get("PGUSER", "postgres")
            database = os.environ.get("PGDATABASE", "postgres")
            # URL-encode the password as it may contain special characters
            encoded_password = quote_plus(password)
            return f"postgresql://{user}:{encoded_password}@{host}:5432/{database}?sslmode=require"
        except Exception as e:
            print(f"[v0] Aurora IAM auth failed, falling back to password auth: {e}")
    
    # Fallback to traditional password auth for local development
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "sustainability_ai")
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")
    return f"postgresql://{user}:{password}@{host}:{port}/{db}"


DATABASE_URL = _get_database_url()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database extensions and create tables.
    """
    try:
        with engine.begin() as conn:
            # Required for pgvector column type
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    except Exception as e:
        print(f"[v0] Warning: Could not create vector extension: {e}")

    # Import models here to avoid circular imports
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
