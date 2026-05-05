import { useState } from "react";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { extractTextFromPdf } from "@/lib/pdfExtractor";
import { parseEsgReportFromText } from "@/lib/esgParser";

interface PdfExtractionUploadProps {
  onReportCreated?: () => void | Promise<void>;
}

export default function PdfExtractionUpload({ onReportCreated }: PdfExtractionUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [extractedPreview, setExtractedPreview] = useState("");
  const [createdReport, setCreatedReport] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function handleExtractAndSave() {
    if (!file) {
      setStatus("Please select a PDF file first.");
      return;
    }

    if (file.type && file.type !== "application/pdf") {
      setStatus("Only PDF files are supported.");
      return;
    }

    try {
      setIsProcessing(true);
      setStatus("Extracting text from PDF...");
      setCreatedReport(null);
      setExtractedPreview("");

      const text = await extractTextFromPdf(file);

      if (!text.trim()) {
        setStatus("No selectable text was found. This may be a scanned PDF.");
        return;
      }

      setExtractedPreview(text.slice(0, 1200));
      setStatus("Parsing ESG metrics...");

      const parsedReport = parseEsgReportFromText(text, file.name);

      setStatus("Saving extracted report to Neon...");

      const response = await fetch("/api/create-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedReport),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(async () => ({
          error: await response.text(),
        }));
        throw new Error(errorPayload.detail || errorPayload.error || "Failed to save report");
      }

      const result = await response.json();
      setCreatedReport(result.report || result);
      setStatus("PDF extracted and saved to Neon successfully.");
      await onReportCreated?.();
    } catch (error) {
      console.error(error);
      setStatus(
        error instanceof Error
          ? `PDF extraction failed: ${error.message}`
          : "PDF extraction failed."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>PDF Extraction Demo</CardTitle>
            <CardDescription>
              Extract text in the browser, parse ESG metrics, and save the generated report to Neon.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            const selected = event.target.files?.[0] || null;
            setFile(selected);
            setStatus("");
            setExtractedPreview("");
            setCreatedReport(null);
          }}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
        />

        {file && (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{file.name}</p>
            <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        <Button onClick={handleExtractAndSave} disabled={!file || isProcessing} className="gap-2">
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {isProcessing ? "Processing PDF..." : "Extract PDF and Save Report"}
        </Button>

        {status && <p className="text-sm font-medium text-muted-foreground">{status}</p>}

        {createdReport && (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-900">
            <p className="font-semibold">Created Report</p>
            <p>Company: {createdReport.company_name || createdReport.companyName}</p>
            <p>ESG Score: {createdReport.esg_score || createdReport.esgScore}</p>
          </div>
        )}

        {extractedPreview && (
          <div className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-sm">
            <p className="mb-2 font-semibold">Extracted Text Preview</p>
            <pre className="whitespace-pre-wrap font-sans text-muted-foreground">{extractedPreview}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
