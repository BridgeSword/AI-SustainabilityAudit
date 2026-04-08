import { useState } from "react";

export default function PDFUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [reportId, setReportId] = useState("");
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file || !reportId) {
      setMessage("Please choose a PDF and enter report ID.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
      `http://localhost:9092/pdf/v1/upload?report_id=${reportId}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.detail || "Upload failed");
      return;
    }

    setJobId(data.job_id);
    setStatus("processing");
    setMessage("Upload succeeded, extraction job created.");
  };

  const checkStatus = async () => {
    if (!jobId || !reportId) return;

    const res = await fetch(
      `http://localhost:9092/pdf/v1/jobs/${jobId}/status?report_id=${reportId}`
    );
    const data = await res.json();

    if (!res.ok) {
      setMessage(data.detail || "Status check failed");
      return;
    }

    setStatus(data.status || "unknown");
  };

  return (
    <div className="p-4 rounded-2xl border space-y-4">
      <h2 className="text-xl font-semibold">Upload Sustainability Report PDF</h2>

      <input
        className="border rounded p-2 w-full"
        type="text"
        placeholder="Report ID"
        value={reportId}
        onChange={(e) => setReportId(e.target.value)}
      />

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded bg-black text-white"
          onClick={handleUpload}
        >
          Upload
        </button>

        <button
          className="px-4 py-2 rounded border"
          onClick={checkStatus}
          disabled={!jobId}
        >
          Check Status
        </button>
      </div>

      {jobId && <p>Job ID: {jobId}</p>}
      {status && <p>Status: {status}</p>}
      {message && <p>{message}</p>}
    </div>
  );
}