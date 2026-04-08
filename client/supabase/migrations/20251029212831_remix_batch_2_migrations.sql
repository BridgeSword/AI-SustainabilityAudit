
-- Migration: 20251008020956
-- Create companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  industry TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sustainability reports table
CREATE TABLE public.sustainability_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  report_year INTEGER NOT NULL,
  ghg_emissions NUMERIC,
  file_url TEXT,
  file_name TEXT,
  report_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, report_year)
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sustainability_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (auditing site is public)
CREATE POLICY "Anyone can view companies"
  ON public.companies FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert companies"
  ON public.companies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update companies"
  ON public.companies FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can view reports"
  ON public.sustainability_reports FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert reports"
  ON public.sustainability_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update reports"
  ON public.sustainability_reports FOR UPDATE
  USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.sustainability_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for report files
INSERT INTO storage.buckets (id, name, public)
VALUES ('sustainability-reports', 'sustainability-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Public Access to Reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sustainability-reports');

CREATE POLICY "Anyone can upload reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sustainability-reports');

-- Migration: 20251008021014
-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
