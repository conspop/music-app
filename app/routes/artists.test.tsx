import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(),
    useActionData: vi.fn(),
    useNavigation: () => ({ state: "idle" }),
    Form: ({
      children,
      ...props
    }: React.FormHTMLAttributes<HTMLFormElement> & {
      children: React.ReactNode;
    }) => <form {...props}>{children}</form>,
  };
});

import { useLoaderData, useActionData } from "react-router";
import Artists from "./artists";

const mockUseLoaderData = vi.mocked(useLoaderData);
const mockUseActionData = vi.mocked(useActionData);

describe("Artists", () => {
  beforeEach(() => {
    mockUseActionData.mockReturnValue(undefined);
  });

  it("renders the list of followed artists", () => {
    mockUseLoaderData.mockReturnValue({
      follows: [
        {
          followId: "f1",
          artistId: "a1",
          artistName: "Radiohead",
          createdAt: new Date(),
        },
        {
          followId: "f2",
          artistId: "a2",
          artistName: "Bjork",
          createdAt: new Date(),
        },
      ],
    });

    render(<Artists />);
    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText("Bjork")).toBeInTheDocument();
  });

  it("renders unfollow buttons for each artist", () => {
    mockUseLoaderData.mockReturnValue({
      follows: [
        {
          followId: "f1",
          artistId: "a1",
          artistName: "Radiohead",
          createdAt: new Date(),
        },
      ],
    });

    render(<Artists />);
    expect(
      screen.getByRole("button", { name: /unfollow/i }),
    ).toBeInTheDocument();
  });

  it("renders the add artist input", () => {
    mockUseLoaderData.mockReturnValue({ follows: [] });

    render(<Artists />);
    expect(
      screen.getByPlaceholderText(/artist name/i),
    ).toBeInTheDocument();
  });

  it("renders the follow button", () => {
    mockUseLoaderData.mockReturnValue({ follows: [] });

    render(<Artists />);
    expect(
      screen.getByRole("button", { name: /follow/i }),
    ).toBeInTheDocument();
  });

  it("renders empty state when no artists are followed", () => {
    mockUseLoaderData.mockReturnValue({ follows: [] });

    render(<Artists />);
    expect(
      screen.getByText(/not following any artists/i),
    ).toBeInTheDocument();
  });
});
