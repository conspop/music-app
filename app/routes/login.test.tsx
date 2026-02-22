import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Login from "./login";

describe("Login", () => {
  it("renders the sign in link", () => {
    render(<Login />);
    expect(
      screen.getByRole("link", { name: /sign in with google/i }),
    ).toBeInTheDocument();
  });

  it("links to the Google auth route", () => {
    render(<Login />);
    const link = screen.getByRole("link", { name: /sign in with google/i });
    expect(link).toHaveAttribute("href", "/auth/google");
  });
});
