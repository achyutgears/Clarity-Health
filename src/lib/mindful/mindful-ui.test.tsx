import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalmBreak } from "@/components/mindful/calm-break";
import { QuizGame } from "@/components/mindful/quiz-game";
import { TeaserGame } from "@/components/mindful/teaser-game";

describe("QuizGame", () => {
  it("answers with a number key, shows feedback and moves on", async () => {
    render(<QuizGame onExit={() => {}} />);
    expect(await screen.findByText("Question 1 of 10")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "1" });
    expect(await screen.findByText(/That’s right!|Not quite\. The answer is/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Next question/ }));
    expect(await screen.findByText("Question 2 of 10")).toBeInTheDocument();
  });

  it("calls onExit from the back control", async () => {
    const onExit = vi.fn();
    render(<QuizGame onExit={onExit} />);
    fireEvent.click(screen.getByRole("button", { name: /Back to Mindful Moments/ }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe("TeaserGame", () => {
  it("shows a hint, reveals the answer and advances", async () => {
    render(<TeaserGame onExit={() => {}} />);
    expect(await screen.findByText("Puzzle 1 of 5")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Hint$/ }));
    expect(screen.getByText("Hint:")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Show answer/ }));
    expect(screen.getByText(/The answer is/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Next puzzle/ }));
    expect(await screen.findByText("Puzzle 2 of 5")).toBeInTheDocument();
  });
});

describe("CalmBreak", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("walks through phases, pauses, resumes and ends", () => {
    vi.useFakeTimers({
      toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "performance"],
    });
    render(<CalmBreak onExit={() => {}} />);
    const status = () => screen.getByRole("status").textContent;
    expect(status()).toBe("Ready when you are");

    fireEvent.click(screen.getByRole("button", { name: /Start/ }));
    expect(status()).toBe("Breathe in…");

    act(() => {
      vi.advanceTimersByTime(4_250);
    });
    expect(status()).toBe("Hold…");

    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(status()).toBe("Breathe out…");

    fireEvent.click(screen.getByRole("button", { name: /Pause/ }));
    expect(status()).toBe("Paused");
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(status()).toBe("Paused");

    fireEvent.click(screen.getByRole("button", { name: /Resume/ }));
    expect(status()).toBe("Breathe out…");

    fireEvent.click(screen.getByRole("button", { name: /End/ }));
    expect(status()).toBe("Nice work taking a moment for yourself.");
    expect(screen.getByText(/relaxation exercise, not a treatment/)).toBeInTheDocument();
  });
});
