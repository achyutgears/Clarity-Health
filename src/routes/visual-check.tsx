import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, RotateCcw, Trash2, Aperture } from "lucide-react";
import { PageHeader, Notice } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/visual-check")({
  head: () => pageMeta("Visual Check", "Capture or upload an image for visual verification."),
  component: VisualCheck,
});

function VisualCheck() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = () => { stream?.getTracks().forEach((t) => t.stop()); setStream(null); };
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);
  useEffect(() => { if (videoRef.current && stream) videoRef.current.srcObject = stream; }, [stream]);

  const startCamera = async () => {
    setError(null);
    try {
      setImage(null);
      setStream(await navigator.mediaDevices.getUserMedia({ video: true }));
    } catch {
      setError("Camera unavailable or permission denied. You can upload an image instead.");
    }
  };
  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    setImage(c.toDataURL("image/jpeg"));
    stop();
  };
  const onFile = (f?: File) => {
    if (!f) return;
    stop();
    const r = new FileReader();
    r.onload = () => setImage(r.result as string);
    r.readAsDataURL(f);
  };
  const remove = () => { setImage(null); if (fileRef.current) fileRef.current.value = ""; };

  return (
    <>
      <PageHeader eyebrow="Verification" title="Visual Check" description="Images stay in your browser. Nothing is uploaded." />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="surface p-5 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            <Button onClick={startCamera} disabled={!!stream}><Camera className="h-4 w-4" /> Open camera</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Upload image</Button>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Upload image" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {error && <div className="mt-4"><Notice tone="warning">{error}</Notice></div>}
          <div className="mt-4 flex aspect-video items-center justify-center overflow-hidden rounded-md border bg-muted">
            {stream ? (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" aria-label="Camera preview" />
            ) : image ? (
              <img src={image} alt="Selected for visual check" className="h-full w-full object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground">No image selected</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {stream && <Button onClick={capture}><Aperture className="h-4 w-4" /> Capture</Button>}
            {stream && <Button variant="ghost" onClick={stop}>Close camera</Button>}
            {image && <Button variant="outline" onClick={startCamera}><RotateCcw className="h-4 w-4" /> Retake</Button>}
            {image && <Button variant="outline" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</Button>}
          </div>
        </section>
        <section className="surface p-5" aria-live="polite">
          <h2 className="font-display text-xl">Result</h2>
          <div className="mt-4">
            <Notice tone="warning">
              No image analysis service is configured. {image ? "Your image is ready, but it has not been analyzed." : "Add an image to prepare it for analysis."}
            </Notice>
          </div>
        </section>
      </div>
    </>
  );
}
