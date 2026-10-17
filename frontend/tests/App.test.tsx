import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "@/App";

describe("Learnova AI - Frontend Application", () => {
  it("renders the application and tagline correctly", () => {
    render(<App />);
    expect(screen.getAllByText(/Learnova/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Learn with AI/i).length).toBeGreaterThan(0);
  });
});
