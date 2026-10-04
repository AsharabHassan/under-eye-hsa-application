import type { Metadata } from "next";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "Free AI Under-Eye Analysis in London · Harley Street Aesthetics",
  description:
    "Upload a selfie for a personalised under-eye analysis — hollowing, dark circles, puffiness, fine lines and crow's feet — matched to a Harley Street Aesthetics treatment, then book a consultation at 10 Harley Street.",
  // `/` is the London analyzer; this route stays live for existing links.
  alternates: { canonical: "/" },
  openGraph: {
    title: "Free AI Under-Eye Analysis in London · Harley Street Aesthetics",
    description:
      "See which under-eye treatment could suit you, then book a consultation with our doctor-led Harley Street team.",
    url: "/london",
  },
};

export default function LondonUnderEyeAnalysis() {
  return <WizardShell clinicLocation="london" />;
}
