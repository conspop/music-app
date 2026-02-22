import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Home from "./home";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => ({
      user: { id: "u1", name: "Alice", email: "alice@example.com" },
    }),
  };
});

describe("Home", () => {
  it("renders the user's name", () => {
    render(<Home />);
    expect(screen.getByText("Welcome, Alice")).toBeInTheDocument();
  });

  it("shows the email", () => {
    render(<Home />);
    expect(
      screen.getByText(/signed in as alice@example\.com/i),
    ).toBeInTheDocument();
  });

  it("has a sign out button", () => {
    render(<Home />);
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });
});
