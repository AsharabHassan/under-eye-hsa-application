"use client";

import { useRef, useState } from "react";
import { Camera, Upload, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DisclaimerBanner } from "@/components/compliance/DisclaimerBanner";
import {
  CameraCapture,
  inPageCameraAvailable,
} from "@/components/scan/CameraCapture";
import { PhotoGuide } from "@/components/scan/PhotoGuide";
import { useWizard, type MediaType } from "@/store/wizard-store";
import { fileToDownscaledImage } from "@/lib/image";

export function ConsentCaptureScreen() {
  const setImageConsent = useWizard((s) => s.setImageConsent);
  const setImage = useWizard((s) => s.setImage);
  const beginScan = useWizard((s) => s.beginScan);

  const [mode, setMode] = useState<"choose" | "camera">("choose");
  // The phone's own camera app, via <input capture>. Works where the in-page
  // preview cannot: plain http, and the Instagram / Facebook in-app browsers.
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const [inPageCameraFailed, setInPageCameraFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleCapture(base64: string, mediaType: MediaType) {
    setImageConsent(true);
    setImage(base64, mediaType);
    beginScan();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      input.value = "";
      return;
    }
    try {
      setImageConsent(true);
      // Downscale + re-encode before storing. A full-resolution phone photo held
      // raw in memory can crash/reload the tab on mobile (which resets the wizard
      // back to the start) — this keeps it small and upright.
      const { base64, mediaType } = await fileToDownscaledImage(file);
      setImage(base64, mediaType);
      beginScan();
    } catch {
      setError("Sorry, we couldn't read that image. Please try another photo.");
    } finally {
      // Allow re-selecting the same file (onChange won't fire otherwise).
      input.value = "";
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-peach-deep">
        Step 1 · Your photo
      </p>
      <h2 className="mt-3 font-serif text-[32px] leading-tight text-heading sm:text-[38px]">
        A quick photo to begin
      </h2>
      <p className="mt-3 text-body">
        Our AI looks closely at your whole eye area &mdash; upper lids,
        under-eyes and outer corners &mdash; to tailor your result. Your photo
        is securely sent to our AI provider and to our own secure analysis
        server for this one-time analysis. This app does not keep the original upload &mdash;
        your personalised report is emailed to you and saved to your clinic
        record.
      </p>

      {mode === "camera" ? (
        <div className="mt-8">
          <CameraCapture
            onCapture={handleCapture}
            onError={(m) => {
              setInPageCameraFailed(true);
              setError(m);
              setMode("choose");
            }}
          />
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          <PhotoGuide />

          <p className="rounded-2xl border border-sage/25 bg-sage/[0.07] px-4 py-3 text-xs leading-relaxed text-body/80">
            <Lock size={13} className="mr-1 inline text-sage-deep" />
            By choosing an option below, I explicitly consent to my selfie being
            securely sent to the AI provider and to Harley Street
            Aesthetics&rsquo; own secure analysis server for this one-time eye
            analysis. My personalised report, which includes my photo, will be
            emailed to me and saved to my clinic contact record.
          </p>

          {error && (
            <p className="rounded-xl border border-peach/30 bg-peach/10 px-4 py-3 text-sm text-heading">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => {
                setImageConsent(true);
                setError(null);
                if (inPageCameraFailed || !inPageCameraAvailable()) {
                  nativeCameraRef.current?.click();
                } else {
                  setMode("camera");
                }
              }}
            >
              <Camera size={18} /> Use camera
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => {
                setImageConsent(true);
                fileRef.current?.click();
              }}
            >
              <Upload size={18} /> Upload photo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleUpload}
            />
            <input
              ref={nativeCameraRef}
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              onChange={handleUpload}
            />
          </div>

          <DisclaimerBanner className="mt-2" />
        </div>
      )}
    </div>
  );
}
