
import { useState, useMemo, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  Shield,
  ShieldCheck,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Network,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ArrowRight,
  LockKeyhole,
  ScanSearch,
  RotateCcw,
  Link as LinkIcon,
  Plus,
  Printer,
} from "lucide-react";

import "./App.css";

// ======================================
// DEMO REPORT
// ======================================

const demoReport = {
  risk: "Medium",
  summary:
    "Several ordinary details may reveal more information when combined. This fictional example demonstrates possible cumulative privacy exposure.",
  clues: [
    {
      id: "1",
      title: "Organisation identifier",
      source: "Image 1",
      evidence:
        "An organisation logo may reveal an affiliation.",
      risk: "Medium",
    },
    {
      id: "2",
      title: "Timetable information",
      source: "Image 2",
      evidence:
        "A timetable may expose recurring activities.",
      risk: "Medium",
    },
    {
      id: "3",
      title: "Public event",
      source: "Text note",
      evidence:
        "A post mentions an upcoming event.",
      risk: "Low",
    },
  ],
  connections: [
    {
      from: "1",
      to: "2",
      label: "Affiliation and timetable",
    },
    {
      from: "2",
      to: "3",
      label: "Routine and event",
    },
  ],
  recommendations: [
    "Hide unnecessary organisation identifiers.",
    "Remove timetable details before sharing.",
    "Limit event posts to their intended audience.",
  ],
};

// ======================================
// HELPERS
// ======================================

function normalizeRisk(value) {
  const risk = String(value || "").toLowerCase();
  if (risk === "high") return "High";
  if (risk === "low") return "Low";
  return "Medium";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function RiskBadge({ level }) {
  const risk = normalizeRisk(level);

  return (
    <span className={`risk-badge ${risk.toLowerCase()}`}>
      {risk} Risk
    </span>
  );
}

// ======================================
// EXPOSURE GRAPH
// ======================================

function ExposureGraph({ report }) {
  const { nodes, edges } = useMemo(() => {
    const clues = report.clues || [];
    const connections = report.connections || [];

    const columns = clues.length === 1 ? 1 : 2;

    const nodes = clues.map((clue, index) => ({
      id: String(clue.id),
      position: {
        x: (index % columns) * 310 + 40,
        y: Math.floor(index / columns) * 180 + 50,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: (
          <div className="graph-node-content">
            <span className="graph-node-icon">
              <Eye size={17} />
            </span>
            <strong>{clue.title}</strong>
            <small>{clue.source}</small>
          </div>
        ),
      },
      style: {
        width: 185,
        padding: "12px",
        background: "#17243b",
        color: "#edf2ff",
        borderRadius: "13px",
        border:
          normalizeRisk(clue.risk) === "High"
            ? "1px solid #fb7185"
            : normalizeRisk(clue.risk) === "Medium"
              ? "1px solid #fbbf24"
              : "1px solid #536b91",
        boxShadow: "0 5px 20px #00000030",
      },
    }));

    const validIds = new Set(
      nodes.map((node) => node.id)
    );

    const edges = connections
      .filter(
        (connection) =>
          validIds.has(String(connection.from)) &&
          validIds.has(String(connection.to)) &&
          String(connection.from) !== String(connection.to)
      )
      .map((connection, index) => ({
        id: `edge-${index}`,
        source: String(connection.from),
        target: String(connection.to),
        type: "smoothstep",
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#a4b3ff",
        },
        style: {
          stroke: "#a4b3ff",
          strokeWidth: 2,
        },
      }));

    return { nodes, edges };
  }, [report]);

  const graphHeight = Math.max(
    300,
    Math.ceil(nodes.length / 2) * 180 + 90
  );

  return (
    <div
      className="graph-container"
      style={{ height: Math.min(graphHeight, 700) }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background color="#293a59" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

// ======================================
// EMPTY GRAPH
// ======================================

function NoCluesFound() {
  return (
    <div className="final-empty-graph" role="status">
      <ShieldCheck size={40} color="#71dfbd" />
      <h3>No significant privacy clues detected</h3>
      <p>
        The AI did not identify meaningful privacy
        exposure in the supplied content. This does
        not guarantee that the content is risk-free.
      </p>
    </div>
  );
}

// ======================================
// FINAL VERSION STYLING
// ======================================

const finalStyles = `
.final-url-section {
  margin: 18px 0;
}

.final-url-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #b6c6e2;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.final-url-row {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.final-url-input {
  flex: 1 1 210px;
  min-width: 0;
  padding: 13px;
  border: 1px solid #334660;
  border-radius: 10px;
  outline: none;
  background: #0b1525;
  color: #eef3ff;
  font-size: 12px;
}

.final-url-input:focus {
  border-color: #91a5ff;
}

.final-url-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  color: white;
  background: linear-gradient(120deg,#7183ed,#4c9da5);
  font-size: 12px;
  font-weight: 700;
}

.final-url-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.final-url-help {
  display: block;
  margin-top: 10px;
  color: #8394af;
  font-size: 10px;
  line-height: 1.7;
}

.final-empty-graph {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 25px;
  border: 1px dashed #36516b;
  border-radius: 12px;
  background: #101c2e;
  text-align: center;
}

.final-empty-graph h3 {
  margin: 0;
  color: #d9f9ed;
  font-size: 15px;
}

.final-empty-graph p {
  max-width: 380px;
  margin: 0;
  color: #91a7bb;
  font-size: 12px;
  line-height: 1.7;
}

.final-report-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 18px;
}

.final-pdf-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 15px;
  border: 1px solid #546ca1;
  border-radius: 10px;
  background: #253d68;
  color: #eef3ff;
  font-size: 12px;
  font-weight: 700;
}

.final-pdf-button:hover {
  background: #345083;
}

.final-connections {
  display: grid;
  gap: 10px;
}

.final-connection-card {
  padding: 14px;
  border: 1px solid #344966;
  border-radius: 11px;
  background: #142137;
}

.final-connection-names {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
  color: #d9e3ff;
  font-size: 12px;
  font-weight: 700;
}

.final-connection-names svg {
  color: #9eafff;
}

.final-connection-card p {
  margin: 9px 0 0;
  color: #a7b9d7;
  font-size: 11px;
  line-height: 1.6;
}

.final-print-header {
  display: none;
}

@media print {
  @page {
    size: A4;
    margin: 15mm;
  }

  html, body, #root, .app {
    width: 100% !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    color: #182339 !important;
  }

  .navbar,
  .hero,
  .upload-panel,
  .footer-notice,
  .footer,
  .final-report-actions,
  .graph-container {
    display: none !important;
  }

  .container,
  .workspace,
  .results-panel,
  .report {
    display: block !important;
    width: 100% !important;
    max-width: none !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: white !important;
    color: #182339 !important;
  }

  .final-print-header {
    display: block !important;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid #334a7f;
  }

  .final-print-header h1 {
    margin: 0 0 6px;
    color: #192e57;
    font-size: 23px;
  }

  .final-print-header p {
    margin: 0;
    color: #53627c;
    font-size: 11px;
  }

  .report-heading h2,
  .section-heading h3,
  .clue-top strong,
  .final-connection-names {
    color: #182339 !important;
  }

  .report-heading p,
  .section-heading span,
  .clue-card p,
  .clue-card small,
  .recommendations,
  .recommendations span,
  .final-connection-card p,
  .summary-card p {
    color: #39475f !important;
  }

  .summary-card,
  .clue-card,
  .final-connection-card,
  .final-empty-graph {
    background: #f4f7fc !important;
    border: 1px solid #d8e0ed !important;
    break-inside: avoid;
    box-shadow: none !important;
  }

  .summary-card small {
    color: #39475f !important;
  }

  .risk-badge {
    border: 1px solid #cbd5e1 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .section-heading {
    margin-top: 20px !important;
  }

  .section-heading.graph-only {
    display: none !important;
  }

  .recommendations > div {
    break-inside: avoid;
    color: #39475f !important;
  }

  .final-empty-graph {
    display: none !important;
  }
}
`;

// ======================================
// MAIN APP
// ======================================

export default function App() {
  const [files, setFiles] = useState([]);
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(false);
  const [backendStatus, setBackendStatus] =
    useState("Checking");

  // Backend status
  useEffect(() => {
    fetch("/api/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Backend unavailable");
        }
        return response.json();
      })
      .then((data) => {
        setBackendStatus(
          data.configured ? "Configured" : "API Key Missing"
        );
      })
      .catch(() => setBackendStatus("Offline"));
  }, []);

  // Upload from computer
  function handleFiles(event) {
    const selected = Array.from(
      event.target.files || []
    );

    const valid = selected.filter(
      (file) =>
        [
          "image/png",
          "image/jpeg",
          "image/webp",
        ].includes(file.type) &&
        file.size <= 5 * 1024 * 1024
    );

    if (valid.length !== selected.length) {
      setError(
        "Only PNG, JPG or WEBP images under 5 MB are supported."
      );
    } else {
      setError("");
    }

    const available = Math.max(
      0,
      8 - files.length
    );

    if (valid.length > available) {
      setError(
        "Maximum 8 images are allowed."
      );
    }

    const newFiles = valid
      .slice(0, available)
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
      }));

    setFiles((previous) => [
      ...previous,
      ...newFiles,
    ]);

    event.target.value = "";
  }

  // Add image from public URL
  async function addImageFromUrl() {
    const url = imageUrl.trim();

    if (!url.startsWith("https://")) {
      setError(
        "Please enter a direct public HTTPS image URL."
      );
      return;
    }

    if (files.length >= 8) {
      setError(
        "Maximum 8 images are allowed."
      );
      return;
    }

    setAddingUrl(true);
    setError("");

    try {
      const response = await fetch(
        "/api/image-from-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          "The backend returned an unexpected response."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not load image."
        );
      }

      if (!data.dataUrl || !data.type) {
        throw new Error(
          "The image response is invalid."
        );
      }

      const imageResponse = await fetch(
        data.dataUrl
      );

      const blob = await imageResponse.blob();

      if (blob.size > 5 * 1024 * 1024) {
        throw new Error(
          "Image exceeds 5 MB."
        );
      }

      const extension =
        data.type === "image/png"
          ? "png"
          : data.type === "image/webp"
            ? "webp"
            : "jpg";

      const filename =
        `linked-image-${Date.now()}.${extension}`;

      const file = new File(
        [blob],
        filename,
        { type: data.type }
      );

      const item = {
        id: crypto.randomUUID(),
        file,
        name: filename,
        preview: URL.createObjectURL(file),
      };

      setFiles((previous) => {
        if (previous.length >= 8) {
          URL.revokeObjectURL(item.preview);
          return previous;
        }

        return [...previous, item];
      });

      setImageUrl("");
    } catch (err) {
      setError(
        err.message || "Unable to add image."
      );
    } finally {
      setAddingUrl(false);
    }
  }

  // Remove image
  function removeFile(id) {
    setFiles((previous) => {
      const selected = previous.find(
        (item) => item.id === id
      );

      if (selected) {
        URL.revokeObjectURL(selected.preview);
      }

      return previous.filter(
        (item) => item.id !== id
      );
    });
  }

  // Reset workspace
  function clearAll() {
    files.forEach((item) => {
      URL.revokeObjectURL(item.preview);
    });

    setFiles([]);
    setNote("");
    setImageUrl("");
    setReport(null);
    setError("");
    setDemo(false);
  }

  // Sample report
  function showDemo() {
    setReport(demoReport);
    setDemo(true);
    setError("");
  }

  // Real AI analysis
  async function analyze() {
    if (!files.length && !note.trim()) {
      setError(
        "Upload an image, paste an image URL, or enter text."
      );
      return;
    }

    setError("");
    setLoading(true);
    setReport(null);
    setDemo(false);

    try {
      const images = await Promise.all(
        files.map((item) =>
          fileToBase64(item.file)
        )
      );

      const controller = new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        120000
      );

      let response;

      try {
        response = await fetch(
          "/api/analyze",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: note.trim(),
              images,
            }),
            signal: controller.signal,
          }
        );
      } finally {
        clearTimeout(timeout);
      }

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          "Analysis service returned an unexpected response."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "AI analysis failed."
        );
      }

      if (!data.report) {
        throw new Error(
          "The AI returned no report."
        );
      }

      setReport(data.report);
    } catch (err) {
      setError(
        err.name === "AbortError"
          ? "Analysis timed out. Try fewer images."
          : err.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  // Save as PDF using browser
  function saveAsPDF() {
    if (!report) return;
    window.print();
  }

  // Resolve clue names for connections
  const getClueTitle = (id) => {
    const clue = (report?.clues || []).find(
      (item) => String(item.id) === String(id)
    );

    return clue?.title || `Clue ${id}`;
  };

  // ======================================
  // UI
  // ======================================

  return (
    <div className="app">
      <style>{finalStyles}</style>

      {/* NAVBAR */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <Network size={22} />
          </div>

          <div>
            <h2>
              CLUE<span>FUSE</span>
            </h2>
            <small>
              PRIVACY INTELLIGENCE
            </small>
          </div>
        </div>

        <div className="nav-right">
          <span>
            <LockKeyhole size={15} />
            AI: {backendStatus}
          </span>

          <button
            type="button"
            className="reset-button"
            onClick={clearAll}
            title="Reset workspace"
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </header>

      <main className="container">
        {/* HERO */}
        <section className="hero">
          <div className="eyebrow">
            <span className="live-dot" />
            AI PRIVACY EXPOSURE INTELLIGENCE
          </div>

          <h1>
            Your data reveals
            <br />
            <span>more than you think.</span>
          </h1>

          <p>
            One photo may seem harmless. A few shared
            details can tell a bigger story.
            Discover hidden connections before you share.
          </p>

          <div className="hero-tags">
            <span>
              <ImageIcon size={15} />
              Images
            </span>
            <span>
              <FileText size={15} />
              Screenshots
            </span>
            <span>
              <ScanSearch size={15} />
              Text clues
            </span>
          </div>
        </section>

        <section className="workspace">
          {/* LEFT PANEL */}
          <div className="panel upload-panel">
            <div className="panel-header">
              <div className="heading-group">
                <span className="step-number">
                  01
                </span>

                <div>
                  <h2>Build your scan</h2>
                  <p>
                    Add content you own or
                    are authorised to review.
                  </p>
                </div>
              </div>

              <span className="file-counter">
                {files.length}/8 Files
              </span>
            </div>

            {/* UPLOAD IMAGE */}
            <label className="upload-box">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleFiles}
                disabled={files.length >= 8}
              />

              <div className="upload-icon">
                <UploadCloud size={27} />
              </div>

              <strong>
                Click to upload images or screenshots
              </strong>

              <span>
                PNG, JPG or WEBP • Max 5 MB each
              </span>
            </label>

            {/* IMAGE URL */}
            <div className="final-url-section">
              <label
                className="final-url-label"
                htmlFor="image-url"
              >
                <LinkIcon size={15} />
                OR PASTE IMAGE URL
              </label>

              <div className="final-url-row">
                <input
                  id="image-url"
                  type="url"
                  className="final-url-input"
                  value={imageUrl}
                  onChange={(event) =>
                    setImageUrl(event.target.value)
                  }
                  placeholder="https://example.com/photo.jpg"
                  disabled={addingUrl}
                />

                <button
                  type="button"
                  className="final-url-button"
                  onClick={addImageFromUrl}
                  disabled={
                    addingUrl ||
                    !imageUrl.trim() ||
                    files.length >= 8
                  }
                >
                  <Plus size={16} />
                  {addingUrl
                    ? "Loading..."
                    : "Add Image"}
                </button>
              </div>

              <small className="final-url-help">
                Use a direct public HTTPS image link.
                PNG, JPG and WEBP are supported.
              </small>
            </div>

            {/* FILE PREVIEWS */}
            {files.length > 0 && (
              <div className="file-list">
                {files.map((item) => (
                  <div
                    className="file-item"
                    key={item.id}
                  >
                    <img
                      src={item.preview}
                      alt={item.name}
                    />

                    <div className="file-info">
                      <strong>
                        {item.name}
                      </strong>
                      <small>
                        Ready for analysis
                      </small>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeFile(item.id)
                      }
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* TEXT INPUT */}
            <div className="field-header">
              <label htmlFor="notes">
                TEXT CONTEXT
              </label>
              <small>Optional</small>
            </div>

            <textarea
              id="notes"
              maxLength={5000}
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="Paste a social media caption, document excerpt, screenshot text or other context..."
            />

            <div className="character-count">
              {note.length}/5000 characters
            </div>

            {/* ERROR */}
            {error && (
              <div className="error-box">
                <AlertTriangle size={17} />
                <span>{error}</span>
              </div>
            )}

            {/* ANALYZE */}
            <button
              type="button"
              className="analyze-button"
              onClick={analyze}
              disabled={loading || addingUrl}
            >
              <Sparkles size={18} />
              {loading
                ? "AI is analyzing..."
                : "Analyze Privacy Exposure"}
              <ArrowRight size={18} />
            </button>

            {/* DEMO */}
            <button
              type="button"
              className="demo-button"
              onClick={showDemo}
              disabled={loading}
            >
              <Eye size={17} />
              Explore Sample Report
            </button>

            {/* PRIVACY */}
            <div className="privacy-note">
              <ShieldCheck size={17} />
              <p>
                Only scan content you own or have
                permission to audit. Live analysis
                sends inputs to Adaption AI.
                Avoid uploading sensitive secrets.
              </p>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="panel results-panel">
            {!report ? (
              <div className="empty-state">
                <div className="empty-graphic">
                  <Shield size={48} />
                </div>

                <h2>
                  Your exposure map awaits
                </h2>

                <p>
                  Upload images, paste image URLs,
                  or enter text to discover
                  possible privacy exposure.
                </p>

                <div className="empty-features">
                  <div>
                    <CheckCircle2 size={17} />
                    Cross-file relationships
                  </div>

                  <div>
                    <CheckCircle2 size={17} />
                    Evidence-based clues
                  </div>

                  <div>
                    <CheckCircle2 size={17} />
                    Practical privacy fixes
                  </div>
                </div>
              </div>
            ) : (
              <div className="report">
                {/* PDF PRINT HEADER */}
                <div className="final-print-header">
                  <h1>CLUEFUSE</h1>
                  <p>
                    Privacy Exposure Intelligence Report
                    {" • "}
                    {demo
                      ? "Illustrative Demo"
                      : "AI Analysis"}
                  </p>
                </div>

                {/* PDF BUTTON */}
                <div className="final-report-actions">
                  <button
                    type="button"
                    className="final-pdf-button"
                    onClick={saveAsPDF}
                  >
                    <Printer size={16} />
                    Save as PDF
                  </button>
                </div>

                {/* REPORT HEADING */}
                <div className="report-heading">
                  <div>
                    <h2>Exposure Report</h2>
                    <p>
                      {demo
                        ? "Demo: illustrative sample"
                        : "AI analysis — review findings"}
                    </p>
                  </div>

                  <RiskBadge
                    level={report.risk}
                  />
                </div>

                {/* SUMMARY */}
                <div className="summary-card">
                  <small>
                    ANALYSIS OVERVIEW
                  </small>
                  <p>{report.summary}</p>
                </div>

                {/* GRAPH */}
                <div className="section-heading graph-only">
                  <h3>
                    <Network size={18} />
                    Exposure Graph
                  </h3>

                  <span>
                    {report.clues?.length || 0}
                    {" "}clues
                  </span>
                </div>

                {report.clues?.length > 0 ? (
                  <ExposureGraph report={report} />
                ) : (
                  <NoCluesFound />
                )}

                {/* CONNECTION DETAILS */}
                {report.connections?.length > 0 && (
                  <>
                    <div className="section-heading">
                      <h3>
                        <Network size={18} />
                        Clue Connections
                      </h3>
                      <span>
                        {report.connections.length} links
                      </span>
                    </div>

                    <div className="final-connections">
                      {report.connections.map(
                        (connection, index) => (
                          <div
                            className="final-connection-card"
                            key={index}
                          >
                            <div className="final-connection-names">
                              <span>
                                {getClueTitle(
                                  connection.from
                                )}
                              </span>

                              <ArrowRight size={16} />

                              <span>
                                {getClueTitle(
                                  connection.to
                                )}
                              </span>
                            </div>

                            <p>
                              {connection.label}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}

                {/* DETECTED CLUES */}
                {report.clues?.length > 0 && (
                  <>
                    <div className="section-heading">
                      <h3>
                        <Eye size={18} />
                        Detected Clues
                      </h3>
                    </div>

                    <div className="clue-list">
                      {report.clues.map((clue) => (
                        <div
                          className="clue-card"
                          key={clue.id}
                        >
                          <div className="clue-top">
                            <strong>
                              {clue.title}
                            </strong>
                            <RiskBadge
                              level={clue.risk}
                            />
                          </div>

                          <small>
                            {clue.source}
                          </small>

                          <p>
                            {clue.evidence}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* RECOMMENDATIONS */}
                {report.recommendations?.length > 0 && (
                  <>
                    <div className="section-heading">
                      <h3>
                        <ShieldCheck size={18} />
                        Recommended Actions
                      </h3>
                    </div>

                    <div className="recommendations">
                      {report.recommendations.map(
                        (item, index) => (
                          <div key={index}>
                            <CheckCircle2 size={17} />
                            <span>{item}</span>
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}

                {demo && (
                  <p
                    style={{
                      color: "#8d9db8",
                      fontSize: "11px",
                      marginTop: "25px",
                    }}
                  >
                    Demo report only. These findings
                    are fictional examples.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* FOOTER NOTICE */}
        <div className="footer-notice">
          <ShieldCheck size={20} />
          <p>
            <strong>
              Privacy-first approach.
            </strong>{" "}
            CLUEFUSE provides possible
            privacy exposure warnings, not
            verified identity, location or
            danger predictions. AI can make mistakes.
          </p>
        </div>
      </main>

      <footer className="footer">
        <span>© 2026 CLUEFUSE</span>
        <span>Powered by Adaption AI</span>
      </footer>
    </div>
  );
}
