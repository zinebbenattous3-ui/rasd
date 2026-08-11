import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  FileText, 
  Image as ImageIcon, 
  AlertTriangle, 
  Loader2
} from "lucide-react";
import { getProofSignedUrl, extractFileName, isPdfFile } from "@/lib/proof-storage";
import { verifyHealthEventProofAccess } from "@/lib/proof-authorization";

export interface PatientProofViewerProps {
  open: boolean;
  onClose: () => void;
  storagePath: string | null;
  healthEventId?: string | undefined;
  documentTitle?: string | undefined;
}

export function PatientProofViewer({
  open,
  onClose,
  storagePath,
  healthEventId,
  documentTitle
}: PatientProofViewerProps) {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  
  // Image Viewer State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch & Pinch State
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);
  const [touchStartScale, setTouchStartScale] = useState<number>(1);

  // PDF Viewer State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.2);
  const [pdfRendering, setPdfRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // File Metadata
  const cleanFileName = documentTitle || extractFileName(storagePath);
  const isPdf = isPdfFile(storagePath);

  // Global ESC Key & Save/Print Hotkey Interception
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept Ctrl+S / Cmd+S / Ctrl+P / Cmd+P to block saving & printing
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S" || e.key === "p" || e.key === "P")) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.key === "Escape" || e.key === "Esc") {
        onClose();
      } else if (isPdf && pdfDoc) {
        if (e.key === "ArrowRight" || e.key === "PageDown") {
          setPageNum((prev) => Math.min(prev + 1, numPages));
        } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
          setPageNum((prev) => Math.max(prev - 1, 1));
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, isPdf, pdfDoc, numPages]);

  // Load & Authorize Signed URL
  useEffect(() => {
    if (!open || !storagePath) return;

    let isMounted = true;
    let refreshTimer: NodeJS.Timeout;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      setSignedUrl(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setPageNum(1);

      try {
        // 1. Verify authorization
        const authCheck = await verifyHealthEventProofAccess(healthEventId, storagePath);
        if (!authCheck.authorized) {
          if (isMounted) {
            setError(authCheck.reason || "Vous n'êtes pas autorisé à consulter ce document.");
            setLoading(false);
          }
          return;
        }

        // 2. Fetch 10-minute short-lived signed URL
        const url = await getProofSignedUrl(storagePath, 600);
        if (!isMounted) return;

        setSignedUrl(url);

        // Schedule signed URL refresh at 9 minutes (540s) if modal remains open
        refreshTimer = setTimeout(() => {
          if (isMounted && open) {
            loadDocument();
          }
        }, 540 * 1000);

      } catch (err: any) {
        if (isMounted) {
          console.error("Proof Viewer error:", err);
          setError("Impossible d'ouvrir le document. Le document est peut-être indisponible ou vous n'êtes pas autorisé à le consulter.");
        }
      } finally {
        if (isMounted && !isPdf) {
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [open, storagePath, healthEventId]);

  // PDF.js Canvas Renderer
  useEffect(() => {
    if (!open || !isPdf || !signedUrl) return;

    let isCancelled = false;

    const initPdfJs = async () => {
      setLoading(true);
      try {
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Impossible de charger le module d'affichage PDF."));
            document.head.appendChild(script);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const loadedPdf = await pdfjsLib.getDocument(signedUrl).promise;
        if (isCancelled) return;

        setPdfDoc(loadedPdf);
        setNumPages(loadedPdf.numPages);
        setPageNum(1);
        setLoading(false);
      } catch (err) {
        console.error("PDF loading error:", err);
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    initPdfJs();

    return () => {
      isCancelled = true;
    };
  }, [open, isPdf, signedUrl]);

  // Render current PDF page on Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !isPdf) return;

    let isCancelled = false;

    const renderPage = async () => {
      setPdfRendering(true);
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: pdfScale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Page render error:", err);
      } finally {
        if (!isCancelled) setPdfRendering(false);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, pageNum, pdfScale, isPdf]);

  if (!open) return null;

  // Wheel & Trackpad Pinch Zoom / Scroll Handler
  const handleWheel = (e: React.WheelEvent) => {
    // If Ctrl or Meta is held (Pinch gesture or Ctrl+Wheel) -> Zoom
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      if (isPdf) {
        setPdfScale((prev) => Math.min(Math.max(prev + delta, 0.5), 3.5));
      } else {
        setZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 5.0));
      }
      return;
    }

    // Normal wheel scrolling: Page boundary scroll transition for PDF
    if (isPdf && pdfDoc && numPages > 1) {
      const container = viewportRef.current;
      if (container) {
        const isAtBottom = Math.abs(container.scrollHeight - container.clientHeight - container.scrollTop) < 10;
        const isAtTop = container.scrollTop <= 5;

        if (e.deltaY > 30 && isAtBottom && pageNum < numPages) {
          setPageNum((prev) => Math.min(prev + 1, numPages));
          container.scrollTop = 0;
        } else if (e.deltaY < -30 && isAtTop && pageNum > 1) {
          setPageNum((prev) => Math.max(prev - 1, 1));
          container.scrollTop = container.scrollHeight;
        }
      }
    }
  };

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch & Pinch Handlers for Mobile / Touchpad
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && e.touches[0]) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    } else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
      setIsDragging(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDist(dist);
      setTouchStartScale(isPdf ? pdfScale : zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && e.touches[0]) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && touchStartDist !== null && e.touches[0] && e.touches[1]) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = currentDist / touchStartDist;
      const newScale = touchStartScale * scaleFactor;

      if (isPdf) {
        setPdfScale(Math.min(Math.max(newScale, 0.5), 3.5));
      } else {
        setZoom(Math.min(Math.max(newScale, 0.5), 5.0));
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchStartDist(null);
  };

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(6, 44, 84, 0.94)",
        backdropFilter: "blur(12px)",
        zIndex: 250,
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        color: "white"
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Navigation / Security Header */}
      <div 
        style={{
          height: "64px",
          padding: "0 24px",
          backgroundColor: "#041C38",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10
        }}
      >
        {/* Left: Document Metadata */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div 
            style={{
              padding: "8px",
              borderRadius: "10px",
              backgroundColor: "rgba(15, 162, 155, 0.2)",
              color: "#34D399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {isPdf ? <FileText size={20} /> : <ImageIcon size={20} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: "700",
                color: "white",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "320px"
              }}
            >
              {cleanFileName}
            </h3>
            <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
              {isPdf ? `Document PDF (${numPages} page${numPages > 1 ? 's' : ''})` : "Fichier Image médical"}
            </span>
          </div>
        </div>

        {/* Center: Security Badge */}
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "999px",
            backgroundColor: "rgba(234, 179, 8, 0.15)",
            border: "1px solid rgba(234, 179, 8, 0.4)",
            color: "#FDE047",
            fontSize: "0.8rem",
            fontWeight: "700"
          }}
        >
          <Lock size={14} />
          <span>Consultation uniquement</span>
        </div>

        {/* Right: Close Action */}
        <button
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "10px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "white",
            fontWeight: "600",
            fontSize: "0.85rem",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }}
        >
          <span>Fermer</span>
          <X size={18} />
        </button>
      </div>

      {/* Main Document Viewport Area with Natural Wheel Scroll & Gesture Support */}
      <div 
        ref={viewportRef}
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: isPdf ? "flex-start" : "center",
          overflowY: "auto",
          overflowX: "auto",
          padding: "32px 24px",
          cursor: isDragging ? "grabbing" : "grab"
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Loading State */}
        {loading && (
          <div style={{ margin: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", color: "#94A3B8" }}>
            <Loader2 size={36} className="animate-spin" color="#0fa29b" />
            <span style={{ fontSize: "0.95rem", fontWeight: "600" }}>Chargement du document...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div 
            style={{
              margin: "auto",
              backgroundColor: "rgba(127, 29, 29, 0.8)",
              border: "1px solid #EF4444",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "460px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px"
            }}
          >
            <AlertTriangle size={42} color="#FCA5A5" />
            <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800", color: "white" }}>
              Impossible d'ouvrir le document
            </h4>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#FECACA", lineHeight: "1.5" }}>
              {error}
            </p>
            <button
              onClick={onClose}
              style={{
                marginTop: "8px",
                padding: "10px 24px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "white",
                color: "#7F1D1D",
                fontWeight: "700",
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              Fermer
            </button>
          </div>
        )}

        {/* PDF Renderer Viewport */}
        {!loading && !error && isPdf && signedUrl && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", margin: "auto 0" }}>
            {pdfDoc ? (
              <div 
                style={{ 
                  boxShadow: "0 25px 60px rgba(0,0,0,0.6)", 
                  borderRadius: "8px", 
                  overflow: "hidden", 
                  backgroundColor: "white",
                  position: "relative",
                  margin: "16px 0",
                  transform: `translate(${pan.x}px, ${pan.y}px)`,
                  transition: isDragging ? "none" : "transform 0.15s ease-out"
                }}
              >
                {pdfRendering && (
                  <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loader2 size={24} className="animate-spin" color="#0fa29b" />
                  </div>
                )}
                <canvas ref={canvasRef} style={{ display: "block", maxWidth: "100%" }} />
              </div>
            ) : (
              <div style={{ width: "100%", height: "80vh", maxWidth: "1000px", borderRadius: "12px", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
                <iframe
                  src={`${signedUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  title={cleanFileName}
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              </div>
            )}
          </div>
        )}

        {/* Image Renderer Viewport with Multi-Layer Security Protection */}
        {!loading && !error && !isPdf && signedUrl && (
          <div 
            style={{
              margin: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              userSelect: "none",
              WebkitUserSelect: "none"
            }}
          >
            <div 
              style={{
                position: "relative",
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isDragging ? "none" : "transform 0.15s ease-out",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 25px 60px rgba(0,0,0,0.6)"
              }}
            >
              <img
                src={signedUrl}
                alt={cleanFileName}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  maxHeight: "85vh",
                  maxWidth: "90vw",
                  objectFit: "contain",
                  display: "block",
                  pointerEvents: "none",
                  WebkitUserDrag: "none",
                  WebkitTouchCallout: "none" as any
                }}
              />

              {/* Transparent Click Shield & Security Watermark */}
              <div 
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "radial-gradient(circle, transparent 60%, rgba(4,28,56,0.15) 100%)"
                }}
              >
                <div 
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "800",
                    letterSpacing: "0.15em",
                    color: "rgba(255, 255, 255, 0.18)",
                    textTransform: "uppercase",
                    transform: "rotate(-25deg)",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    pointerEvents: "none"
                  }}
                >
                  CONFIDENTIEL • RASSD ALGERIE • CONSULTATION SEULEMENT
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Control Bar */}
      {!loading && !error && signedUrl && (
        <div 
          style={{
            height: "70px",
            padding: "0 24px",
            backgroundColor: "#041C38",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10
          }}
        >
          <div 
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "8px 20px",
              borderRadius: "999px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(8px)"
            }}
          >
            {/* PDF Pagination Controls */}
            {isPdf && pdfDoc && (
              <>
                <button
                  disabled={pageNum <= 1}
                  onClick={() => setPageNum((prev) => Math.max(prev - 1, 1))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: pageNum <= 1 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)",
                    color: pageNum <= 1 ? "#64748B" : "white",
                    fontWeight: "600",
                    fontSize: "0.82rem",
                    cursor: pageNum <= 1 ? "not-allowed" : "pointer"
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Précédent</span>
                </button>

                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#E2E8F0", padding: "0 6px" }}>
                  Page {pageNum} / {numPages}
                </span>

                <button
                  disabled={pageNum >= numPages}
                  onClick={() => setPageNum((prev) => Math.min(prev + 1, numPages))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: pageNum >= numPages ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)",
                    color: pageNum >= numPages ? "#64748B" : "white",
                    fontWeight: "600",
                    fontSize: "0.82rem",
                    cursor: pageNum >= numPages ? "not-allowed" : "pointer"
                  }}
                >
                  <span>Suivant</span>
                  <ChevronRight size={16} />
                </button>

                <div style={{ width: "1px", height: "20px", backgroundColor: "rgba(255,255,255,0.2)", margin: "0 4px" }} />
              </>
            )}

            {/* Zoom Controls */}
            {isPdf ? (
              <>
                <button
                  onClick={() => setPdfScale((prev) => Math.max(prev - 0.2, 0.5))}
                  style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}
                  title="Zoom -"
                >
                  <ZoomOut size={18} />
                </button>

                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#34D399", minWidth: "48px", textAlign: "center" }}>
                  {Math.round(pdfScale * 100)}%
                </span>

                <button
                  onClick={() => setPdfScale((prev) => Math.min(prev + 0.2, 3.5))}
                  style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}
                  title="Zoom +"
                >
                  <ZoomIn size={18} />
                </button>

                <button
                  onClick={() => {
                    setPdfScale(1.2);
                    setPan({ x: 0, y: 0 });
                  }}
                  style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", display: "flex", alignItems: "center", paddingLeft: "4px" }}
                  title="Réinitialiser"
                >
                  <RotateCcw size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.5))}
                  style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}
                  title="Zoom -"
                >
                  <ZoomOut size={18} />
                </button>

                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#34D399", minWidth: "48px", textAlign: "center" }}>
                  {Math.round(zoom * 100)}%
                </span>

                <button
                  onClick={() => setZoom((prev) => Math.min(prev + 0.25, 5.0))}
                  style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}
                  title="Zoom +"
                >
                  <ZoomIn size={18} />
                </button>

                <button
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", display: "flex", alignItems: "center", paddingLeft: "4px" }}
                  title="Réinitialiser"
                >
                  <RotateCcw size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
