import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import type { CareEventInput, MutationResult } from "./types";

const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a) } }));

function setup(onSubmit: (i: CareEventInput) => Promise<MutationResult>) {
  const onClose = vi.fn();
  render(
    <EventFormDialog
      mode={{ type: "create", dateKey: "2026-10-26" }}
      onClose={onClose}
      onSubmit={onSubmit}
      storageLabel="this browser only"
    />,
  );
  return { onClose };
}

describe("EventFormDialog", () => {
  beforeEach(() => toastSuccess.mockReset());

  it("shows inline errors and does not submit invalid input", async () => {
    const onSubmit = vi.fn(async () => ({ ok: true }) as const);
    setup(onSubmit);
    fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: "08:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));

    expect(await screen.findByText("Give this entry a title.")).toBeInTheDocument();
    expect(screen.getByText("End time must be after the start time.")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Title")).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("shows the honesty helpers for appointments, medication and reminders", () => {
    setup(vi.fn());
    expect(screen.getByText("Personal note — not a booking with a clinic.")).toBeInTheDocument();
    expect(screen.getByText(/does not send push or email notifications yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "medication" } });
    expect(screen.getByText(/doesn't give dosing advice/)).toBeInTheDocument();
  });

  it("submits once while saving, then toasts and closes on real success", async () => {
    let resolve: (r: MutationResult) => void = () => {};
    const onSubmit = vi.fn(
      (_input: CareEventInput) =>
        new Promise<MutationResult>((r) => {
          resolve = r;
        }),
    );
    const { onClose } = setup(onSubmit);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "  Follow-up visit " } });
    fireEvent.change(screen.getByLabelText("Reminder"), { target: { value: "15" } });
    const submit = screen.getByRole("button", { name: "Add entry" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.submit(submit.closest("form") as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: "Follow-up visit",
      kind: "appointment",
      reminderMinutes: 15,
      startsAt: new Date(2026, 9, 26, 9, 0).toISOString(),
    });
    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    expect(toastSuccess).not.toHaveBeenCalled();

    await act(async () => resolve({ ok: true }));
    expect(toastSuccess).toHaveBeenCalledWith("Entry added", expect.anything());
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the dialog open with the error when saving fails", async () => {
    const onSubmit = vi.fn(async (): Promise<MutationResult> => ({
      ok: false,
      error: "Network down",
    }));
    const { onClose } = setup(onSubmit);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Lab work" } });
    fireEvent.click(screen.getByRole("button", { name: "Add entry" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Network down");
    await waitFor(() => expect(screen.getByRole("button", { name: "Add entry" })).toBeEnabled());
    expect(onClose).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
