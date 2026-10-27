import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, ready: true, requireAuth }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      throw new Error("cloud must not be used while signed out");
    },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { CalendarPage } from "@/components/calendar/calendar-page";
import { BROWSER_STORAGE_KEY } from "./store";

describe("CalendarPage (signed out)", () => {
  beforeEach(() => {
    localStorage.clear();
    requireAuth.mockReset();
  });

  it("adds an entry end-to-end, shows it on the selected day, and deletes it with confirmation", async () => {
    render(<CalendarPage />);

    expect(
      await screen.findByText(
        "Saved in this browser only. Sign in to keep your calendar in your account.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByText(/does not send push or email notifications yet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(requireAuth).toHaveBeenCalledWith("Sign in to keep your calendar in your account.");

    const dayPanel = screen.getByRole("region", { name: /\d{4}/ });
    fireEvent.click(within(dayPanel).getByRole("button", { name: "Add entry" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "Follow-up visit" },
    });
    fireEvent.change(within(dialog).getByLabelText("Start time"), { target: { value: "23:58" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add entry" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const card = within(dayPanel)
      .getByRole("heading", { name: "Follow-up visit" })
      .closest("article");
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText("Personal entry")).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText("Appointment I'm tracking")).toBeInTheDocument();
    expect(
      within(card as HTMLElement).getByText("Personal note — not a booking with a clinic."),
    ).toBeInTheDocument();
    expect(localStorage.getItem(BROWSER_STORAGE_KEY)).toContain("Follow-up visit");

    fireEvent.click(within(dayPanel).getByRole("button", { name: "Delete Follow-up visit" }));
    const confirm = await screen.findByRole("alertdialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete entry" }));
    await waitFor(() =>
      expect(within(dayPanel).queryByRole("heading", { name: "Follow-up visit" })).toBeNull(),
    );
    expect(JSON.parse(localStorage.getItem(BROWSER_STORAGE_KEY) ?? "[]")).toEqual([]);
  });
});
