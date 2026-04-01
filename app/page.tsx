"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface GalleryImage {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<GalleryImage | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef(0);

  const addToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      const id = ++toastIdRef.current;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
    },
    [],
  );

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/images");
      const data = await res.json();
      setImages(data.images || []);
    } catch {
      addToast("Failed to load images", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    if (!lightbox) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") {
        const idx = images.findIndex((i) => i.id === lightbox.id);
        if (idx < images.length - 1) setLightbox(images[idx + 1]);
      }
      if (e.key === "ArrowLeft") {
        const idx = images.findIndex((i) => i.id === lightbox.id);
        if (idx > 0) setLightbox(images[idx - 1]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightbox, images]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const validFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (validFiles.length === 0) {
        addToast("Please select image files only", "error");
        return;
      }
      setUploading(true);
      const formData = new FormData();
      validFiles.forEach((f) => formData.append("files", f));
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        addToast(
          `${data.images.length} image${data.images.length > 1 ? "s" : ""} uploaded`,
        );
        fetchImages();
      } catch (err: unknown) {
        addToast(err instanceof Error ? err.message : "Upload failed", "error");
      } finally {
        setUploading(false);
      }
    },
    [addToast, fetchImages],
  );

  const handleDelete = useCallback(
    async (image: GalleryImage) => {
      try {
        const res = await fetch("/api/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: image.name }),
        });
        if (!res.ok) throw new Error("Delete failed");
        setImages((prev) => prev.filter((i) => i.id !== image.id));
        setSelected((prev) => {
          const s = new Set(prev);
          s.delete(image.id);
          return s;
        });
        if (lightbox?.id === image.id) setLightbox(null);
        addToast("Image deleted");
      } catch {
        addToast("Failed to delete image", "error");
      } finally {
        setDeleteConfirm(null);
      }
    },
    [addToast, lightbox],
  );

  const handleDeleteSelected = useCallback(async () => {
    const toDelete = images.filter((i) => selected.has(i.id));
    let deleted = 0;
    for (const img of toDelete) {
      try {
        await fetch("/api/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: img.name }),
        });
        deleted++;
      } catch {}
    }
    setImages((prev) => prev.filter((i) => !selected.has(i.id)));
    setSelected(new Set());
    addToast(`${deleted} image${deleted > 1 ? "s" : ""} deleted`);
  }, [images, selected, addToast]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: "rgba(15,15,15,0.85)",
          backdropFilter: "blur(20px)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle
                cx="14"
                cy="14"
                r="10"
                stroke="#c9a96e"
                strokeWidth="1.5"
              />
              <circle cx="14" cy="14" r="5" fill="#c9a96e" opacity="0.3" />
              <path
                d="M14 4 L14 8 M14 20 L14 24 M4 14 L8 14 M20 14 L24 14"
                stroke="#c9a96e"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span
              className="text-xl font-bold tracking-wide"
              style={{
                color: "var(--text)",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              Lumière
            </span>
          </div>
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: "rgba(220,53,69,0.15)",
                  color: "#ff6b6b",
                  border: "1px solid rgba(220,53,69,0.3)",
                }}
              >
                <TrashIcon /> Delete {selected.size} selected
              </button>
            )}
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {images.length} {images.length === 1 ? "image" : "images"}
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#0f0f0f" }}
            >
              {uploading ? (
                <>
                  <SpinnerIcon /> Uploading…
                </>
              ) : (
                <>
                  <UploadIcon /> Upload
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Upload Zone */}
        <div
          className={`upload-zone rounded-2xl p-10 mb-10 text-center cursor-pointer ${dragging ? "dragging" : ""}`}
          style={{ background: "var(--surface-upload-zone)" }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(201,169,110,0.1)" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#c9a96e"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <p className="font-medium" style={{ color: "var(--text)" }}>
                Drop images here or{" "}
                <span style={{ color: "var(--accent)" }}>browse</span>
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                JPG, PNG, GIF, WebP · Multiple files supported
              </p>
            </div>
          </div>
        </div>

        {/* Gallery */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{
                borderColor: "var(--accent)",
                borderTopColor: "transparent",
              }}
            />
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "var(--surface-icon)" }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p
              style={{
                color: "var(--text-muted)",
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.25rem",
              }}
            >
              Your gallery is empty
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Upload your first image to get started
            </p>
          </div>
        ) : (
          <>
            {selected.size > 0 && (
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}
                >
                  {selected.size} selected
                </span>
                <button
                  className="text-sm"
                  style={{ color: "var(--accent)" }}
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </button>
                <button
                  className="text-sm"
                  style={{ color: "var(--accent)" }}
                  onClick={() => setSelected(new Set(images.map((i) => i.id)))}
                >
                  Select all
                </button>
              </div>
            )}
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
              {images.map((img) => (
                <ImageCard
                  key={img.id}
                  image={img}
                  selected={selected.has(img.id)}
                  onView={() => setLightbox(img)}
                  onDelete={() => setDeleteConfirm(img)}
                  onToggleSelect={() => toggleSelect(img.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {/* Lightbox */}
      {lightbox && (
        <div
          className="lightbox fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setLightbox(null)}
        >
          <div
            className="lightbox-img relative max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {images.findIndex((i) => i.id === lightbox.id) > 0 && (
              <button
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--surface2)", color: "var(--text)" }}
                onClick={() => {
                  const idx = images.findIndex((i) => i.id === lightbox.id);
                  setLightbox(images[idx - 1]);
                }}
              >
                ←
              </button>
            )}
            {images.findIndex((i) => i.id === lightbox.id) <
              images.length - 1 && (
              <button
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--surface2)", color: "var(--text)" }}
                onClick={() => {
                  const idx = images.findIndex((i) => i.id === lightbox.id);
                  setLightbox(images[idx + 1]);
                }}
              >
                →
              </button>
            )}
            <img
              src={lightbox.url}
              alt={lightbox.name}
              className="w-full rounded-xl object-contain max-h-[80vh]"
            />
            <div className="mt-3 flex items-center justify-between px-1">
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {lightbox.name}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatSize(lightbox.size)} ·{" "}
                  {new Date(lightbox.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                  style={{
                    background: "rgba(220,53,69,0.15)",
                    color: "#ff6b6b",
                    border: "1px solid rgba(220,53,69,0.2)",
                  }}
                  onClick={() => {
                    setDeleteConfirm(lightbox);
                    setLightbox(null);
                  }}
                >
                  <TrashIcon /> Delete
                </button>
                <button
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: "var(--surface2)",
                    color: "var(--text-muted)",
                  }}
                  onClick={() => setLightbox(null)}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div
          className="lightbox fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{
              background: "var(--surface-popup)",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
              style={{ background: "rgba(220,53,69,0.1)" }}
            >
              <TrashIcon color="#ff6b6b" size={20} />
            </div>
            <h3
              className="text-lg font-bold mb-1"
              style={{
                color: "var(--text)",
                fontFamily: "'Playfair Display', serif",
              }}
            >
              Delete image?
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              <span className="font-medium" style={{ color: "var(--text)" }}>
                {deleteConfirm.name}
              </span>{" "}
              will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: "var(--surface2)", color: "var(--text)" }}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: "rgba(220,53,69,0.9)", color: "white" }}
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div
        className="fixed bottom-6 left-1/2 z-50 flex flex-col gap-2 pointer-events-none"
        style={{ transform: "translateX(-50%)" }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast px-5 py-3 rounded-xl text-sm font-medium shadow-xl"
            style={{
              background:
                toast.type === "error"
                  ? "rgba(220,53,69,0.95)"
                  : "rgba(201,169,110,0.95)",
              color: toast.type === "error" ? "white" : "#0f0f0f",
              whiteSpace: "nowrap",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageCard({
  image,
  selected,
  onView,
  onDelete,
  onToggleSelect,
}: {
  image: GalleryImage;
  selected: boolean;
  onView: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
}) {
  return (
    <div
      className="image-card relative break-inside-avoid rounded-xl overflow-hidden cursor-pointer group"
      style={{
        background: "var(--surface)",
        border: selected ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      <img
        src={image.url}
        alt={image.name}
        className="w-full block"
        loading="lazy"
        onClick={onView}
      />
      <div
        className="card-overlay absolute inset-0 flex flex-col justify-between p-3 opacity-0 transition-opacity duration-200"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.7) 100%)",
        }}
      >
        <div className="flex justify-end">
          <button
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: selected ? "var(--accent)" : "rgba(255,255,255,0.2)",
              border: "1.5px solid rgba(255,255,255,0.4)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
          >
            {selected && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6 L5 9 L10 3"
                  stroke="#0f0f0f"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-end justify-between">
          <p
            className="text-xs truncate flex-1 mr-2"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            {formatSize(image.size)}
          </p>
          <div className="flex gap-1.5">
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              <EyeIcon />
            </button>
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(220,53,69,0.5)", color: "white" }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function TrashIcon({
  color = "currentColor",
  size = 14,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
