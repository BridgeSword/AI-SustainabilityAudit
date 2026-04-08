from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    BigInteger,
    TIMESTAMP,
    ForeignKey,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, BYTEA
from pgvector.sqlalchemy import Vector

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(Text, unique=True, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    reports = relationship("Report", back_populates="user")
    uploaded_pdfs = relationship("PDFFile", back_populates="uploader")


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, nullable=False)
    sector = Column(Text)
    country = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

    reports = relationship("Report", back_populates="company")
    peer_rankings = relationship("PeerRanking", back_populates="company")
    time_series = relationship("TimeSeries", back_populates="company")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_id = Column(Integer, ForeignKey("companies.id"))
    year = Column(Integer, nullable=False)
    extracted_json = Column(JSONB, nullable=False)
    extraction_status = Column(Text, default="pending")
    scoring_status = Column(Text, default="pending")
    anomaly_status = Column(Text, default="pending")
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="reports")
    company = relationship("Company", back_populates="reports")
    metrics = relationship("Metric", back_populates="report", cascade="all, delete-orphan")
    report_text = relationship("ReportText", back_populates="report", uselist=False, cascade="all, delete-orphan")
    llm_scores = relationship("LLMScore", back_populates="report", cascade="all, delete-orphan")
    anomaly_results = relationship("AnomalyResult", back_populates="report", cascade="all, delete-orphan")
    pdf_files = relationship("PDFFile", back_populates="report", cascade="all, delete-orphan")


class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"))
    metric_name = Column(Text, nullable=False)
    raw_value = Column(Float)
    normalized_value = Column(Float)
    unit = Column(Text)
    source = Column(Text, default="extracted")
    created_at = Column(TIMESTAMP, server_default=func.now())

    report = relationship("Report", back_populates="metrics")


class ReportText(Base):
    __tablename__ = "report_text"

    report_id = Column(Integer, ForeignKey("reports.id"), primary_key=True)
    full_text = Column(Text)
    embedding = Column(Vector(1536))

    report = relationship("Report", back_populates="report_text")


class LLMScore(Base):
    __tablename__ = "llm_scores"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"))
    metric_name = Column(Text)
    standard_name = Column(Text)
    score = Column(Float)
    explanation = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

    report = relationship("Report", back_populates="llm_scores")


class AnomalyResult(Base):
    __tablename__ = "anomaly_results"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"))
    model_name = Column(Text)
    anomaly_score = Column(Float)
    is_anomaly = Column(Boolean)
    created_at = Column(TIMESTAMP, server_default=func.now())

    report = relationship("Report", back_populates="anomaly_results")


class PeerRanking(Base):
    __tablename__ = "peer_rankings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    year = Column(Integer)
    method = Column(Text)
    rank = Column(Integer)
    score = Column(Float)
    created_at = Column(TIMESTAMP, server_default=func.now())

    company = relationship("Company", back_populates="peer_rankings")


class TimeSeries(Base):
    __tablename__ = "time_series"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    metric_name = Column(Text)
    year = Column(Integer)
    value = Column(Float)

    company = relationship("Company", back_populates="time_series")


class PDFFile(Base):
    __tablename__ = "pdf_files"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="CASCADE"))
    uploaded_by = Column(Integer, ForeignKey("users.id"))

    filename = Column(Text, nullable=False)
    mime_type = Column(Text, nullable=False, default="application/pdf")
    file_size_bytes = Column(BigInteger)
    sha256 = Column(Text)
    content_blob = Column(BYTEA, nullable=False)
    is_public = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    report = relationship("Report", back_populates="pdf_files")
    uploader = relationship("User", back_populates="uploaded_pdfs")