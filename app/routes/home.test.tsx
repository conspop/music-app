import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Home from "./home";

describe("Home", () => {
  it("renders the welcome page", () => {
    render(<Home />);
    expect(screen.getByText("What's next?")).toBeInTheDocument();
  });
});
