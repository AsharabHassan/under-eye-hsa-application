import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BookingCalendar } from "@/components/result/BookingCalendar";
import { ClinicLocationProvider } from "@/components/clinic/ClinicLocationContext";
import { CALENDAR_URLS, CRM_BOOKING_URL } from "@/lib/constants";
import { useWizard } from "@/store/wizard-store";

const CRM_PAGE =
  "https://app.harleystreetaesthetic.co.uk/book/harley-street-aesthetic/free-online-consultation-with-aesthetic-";

describe("embedded CRM booking calendar", () => {
  beforeEach(() => {
    useWizard.getState().reset();
    useWizard.getState().setLead({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: "07700900123",
    } as Parameters<ReturnType<typeof useWizard.getState>["setLead"]>[0]);
  });
  afterEach(cleanup);

  it("uses the CRM booking page for both clinics", () => {
    expect(CRM_BOOKING_URL).toBe(CRM_PAGE);
    expect(CALENDAR_URLS).toEqual({ london: CRM_PAGE, glasgow: CRM_PAGE });
  });

  it.each(["london", "glasgow"] as const)(
    "embeds the page without prefill and keeps a plain link under it (%s)",
    (location) => {
      const { container } = render(
        <ClinicLocationProvider location={location}>
          <BookingCalendar />
        </ClinicLocationProvider>,
      );
      const frame = container.querySelector("iframe");
      expect(frame).not.toBeNull();
      expect(frame!.getAttribute("src")).toBe(CRM_PAGE);
      expect(frame!.getAttribute("src")).not.toContain("first_name");
      expect(frame!.getAttribute("sandbox")).toContain("allow-forms");
      expect(frame!.getAttribute("sandbox")).toContain("allow-top-navigation-by-user-activation");
      expect(frame!.getAttribute("scrolling")).toBeNull();

      const link = screen.getByRole("link", { name: /open the booking page/i });
      expect(link.getAttribute("href")).toBe(CRM_PAGE);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");

      expect(container.textContent).not.toMatch(/filled in/i);
      expect(container.innerHTML).not.toContain("strategyguys");
    },
  );
});
