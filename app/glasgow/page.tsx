import type { Metadata } from "next";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "Free AI Eye Rejuvenation Analysis in Glasgow · Harley Street Aesthetics",
  description:
    "Upload a selfie for a personalised eye rejuvenation analysis — hollowing, dark circles, puffiness, fine lines and crow's feet — then book a consultation with the doctor-led Harley Street Aesthetics Glasgow team.",
  alternates: { canonical: "/glasgow" },
  openGraph: {
    title: "Free AI Eye Rejuvenation Analysis in Glasgow · Harley Street Aesthetics",
    description:
      "See which eye rejuvenation treatment could suit you, then discuss your plan with our doctor-led Glasgow team at Ingram House.",
    url: "/glasgow",
  },
};

export default function GlasgowUnderEyeAnalysis() {
  return <WizardShell clinicLocation="glasgow" />;
}
