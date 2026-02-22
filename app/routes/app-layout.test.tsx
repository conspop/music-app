import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSearchParams = { current: new URLSearchParams() };

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(),
    useSearchParams: () => [mockSearchParams.current, vi.fn()],
    Outlet: () => <div data-testid="outlet" />,
    NavLink: ({
      to,
      children,
      className,
    }: {
      to: string;
      children: React.ReactNode;
      className?: string | ((...args: unknown[]) => string);
    }) => {
      const cls =
        typeof className === "function"
          ? className({ isActive: false, isPending: false })
          : className;
      return (
        <a href={to} className={cls ?? undefined}>
          {children}
        </a>
      );
    },
  };
});

import { useLoaderData } from "react-router";
import AppLayout from "./app-layout";

const mockUseLoaderData = vi.mocked(useLoaderData);

describe("AppLayout", () => {
  beforeEach(() => {
    mockSearchParams.current = new URLSearchParams();
    mockUseLoaderData.mockReturnValue({
      user: { id: "u1", name: "Alice", email: "alice@example.com" },
      follows: [
        { followId: "f1", artistId: "a1", artistName: "Radiohead", createdAt: new Date() },
      ],
    });
  });

  it("renders the app name", () => {
    render(<AppLayout />);
    expect(screen.getByText("Music App")).toBeInTheDocument();
  });

  it("renders navigation tabs", () => {
    render(<AppLayout />);
    expect(screen.getByRole("link", { name: /news/i })).toHaveAttribute(
      "href",
      "/news",
    );
    expect(screen.getByRole("link", { name: /releases/i })).toHaveAttribute(
      "href",
      "/releases",
    );
    expect(screen.getByRole("link", { name: /events/i })).toHaveAttribute(
      "href",
      "/events",
    );
  });

  it("renders artists link", () => {
    render(<AppLayout />);
    expect(screen.getByRole("link", { name: /artists/i })).toHaveAttribute(
      "href",
      "/artists",
    );
  });

  it("renders the user avatar with initial", () => {
    render(<AppLayout />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders the outlet for child routes", () => {
    render(<AppLayout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("preserves artist filter in tab links", () => {
    mockSearchParams.current = new URLSearchParams("artists=a1,a2");

    render(<AppLayout />);
    expect(screen.getByRole("link", { name: /news/i })).toHaveAttribute(
      "href",
      "/news?artists=a1,a2",
    );
    expect(screen.getByRole("link", { name: /releases/i })).toHaveAttribute(
      "href",
      "/releases?artists=a1,a2",
    );
    expect(screen.getByRole("link", { name: /events/i })).toHaveAttribute(
      "href",
      "/events?artists=a1,a2",
    );
  });
});
