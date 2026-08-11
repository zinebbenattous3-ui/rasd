import React, { useState, useRef } from "react";
import { 
  Paperclip, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Eye, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  FileCheck
} from "lucide-react";
import { 
  validateProofFile, 
  formatFileSize, 
  extractFileName, 
  isPdfFile,
  ALLOWED_EXTENSIONS
} from "@/lib/proof-storage";

export interface ProofUploaderProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  existingFilePath?: string | null;
  onViewExisting?: () => void;
  onDeleteExisting?: () => void;
  uploading?: boolean;
  uploadProgress?: number;
  disabled?: boolean;
}

const COLORS = {
  navy: "#062C54",
  teal: "#0fa29b",
  lightTeal: "#e6f5f4",
  text: "#2d3748",
  muted: "#718096",
  border: "#e2e8f0",
  bgLight: "#f8fafc"
};

export function ProofUploader({
  selectedFile,
  onFileSelect,
  existingFilePath,
  onViewExisting,
  onDeleteExisting,
  uploading = false,
  uploadProgress = 0,
  disabled = false
}: ProofUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  // Handle Drag Leave
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // Handle File Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  // Handle Input Change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  // Process and validate selected file
  const processFile = (file: File) => {
    setErrorMessage(null);
    const validation = validateProofFile(file);

    if (!validation.valid) {
      setErrorMessage(validation.error || "Fichier invalide.");
      onFileSelect(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    onFileSelect(file);
  };

  // Clear selected file
  const handleClearSelected = () => {
    setErrorMessage(null);
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Case 1: Existing Uploaded File on Server
  if (existingFilePath && !selectedFile) {
    const fileName = extractFileName(existingFilePath);
    const isPdf = isPdfFile(existingFilePath);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '12px',
          backgroundColor: COLORS.lightTeal,
          border: `1px solid ${COLORS.teal}`,
          boxShadow: '0 2px 8px rgba(15, 162, 155, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'white', color: COLORS.teal }}>
              {isPdf ? <FileText size={22} /> : <ImageIcon size={22} />}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: COLORS.navy, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {fileName}
              </div>
              <div style={{ fontSize: '0.75rem', color: COLORS.teal, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} /> Document enregistré
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {onViewExisting && (
              <button
                type="button"
                onClick={onViewExisting}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${COLORS.teal}`,
                  backgroundColor: 'white',
                  color: COLORS.teal,
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Eye size={14} /> Voir
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: `1px solid ${COLORS.border}`,
                backgroundColor: 'white',
                color: COLORS.navy,
                fontWeight: '600',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RefreshCw size={13} /> Remplacer
            </button>

            {onDeleteExisting && (
              <button
                type="button"
                onClick={onDeleteExisting}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #FECACA',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Hidden File Input for Replace */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  // Case 2: Selected New File (Ready for upload / Uploading)
  if (selectedFile) {
    const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '12px',
          backgroundColor: '#F8FAFC',
          border: `1px solid ${uploading ? COLORS.teal : COLORS.border}`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: COLORS.lightTeal, color: COLORS.teal }}>
              {isPdf ? <FileText size={22} /> : <ImageIcon size={22} />}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: '700', color: COLORS.navy, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: COLORS.muted }}>
                {formatFileSize(selectedFile.size)}
              </div>

              {/* Progress bar if uploading */}
              {uploading && (
                <div style={{ width: '100%', marginTop: '6px' }}>
                  <div style={{ height: '4px', backgroundColor: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${uploadProgress || 70}%`,
                      backgroundColor: COLORS.teal,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: COLORS.teal, fontWeight: '700', marginTop: '2px' }}>
                    Envoi du document... {uploadProgress ? `${uploadProgress}%` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>

          {!uploading && (
            <button
              type="button"
              onClick={handleClearSelected}
              style={{
                padding: '6px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#F1F5F9',
                color: COLORS.muted,
                cursor: 'pointer',
                marginLeft: '12px'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Case 3: Empty Dropzone (Choose or Drag file)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? COLORS.teal : COLORS.border}`,
          borderRadius: '14px',
          padding: '20px 16px',
          textAlign: 'center',
          backgroundColor: isDragging ? COLORS.lightTeal : COLORS.bgLight,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: COLORS.lightTeal,
          color: COLORS.teal,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <UploadCloud size={22} />
        </div>

        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: COLORS.navy }}>
            Glissez votre document ici
          </div>
          <div style={{ fontSize: '0.82rem', color: COLORS.teal, fontWeight: '600', marginTop: '2px' }}>
            ou <span style={{ textDecoration: 'underline' }}>choisir un fichier</span>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: COLORS.muted, marginTop: '4px' }}>
          PDF, JPG, PNG ou WEBP • 10 MB maximum
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(",")}
        onChange={handleFileInputChange}
        disabled={disabled}
        style={{ display: 'none' }}
      />

      {/* Error Message Box */}
      {errorMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderRadius: '10px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#DC2626',
          fontSize: '0.82rem',
          fontWeight: '600'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
