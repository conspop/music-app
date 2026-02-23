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
    useSubmit: () => vi.fn(),
    useFetcher: () => ({
      load: vi.fn(),
      data: undefined,
      state: "idle",
    }),
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

  it("renders the artist search input", () => {
    mockUseLoaderData.mockReturnValue({ follows: [] });

    render(<Artists />);
    expect(
      screen.getByPlaceholderText(/search for an artist/i),
    ).toBeInTheDocument();
  });

  it("renders empty state when no artists are followed", () => {
    mockUseLoaderData.mockReturnValue({ follows: [] });

    render(<Artists />);
    expect(
      screen.getByText(/not following any artists/i),
    ).toBeInTheDocument();
  });

  it("shows Never ingested when artist has no ingestion runs", () => {
    mockUseLoaderData.mockReturnValue({
      follows: [
        {
          followId: "f1",
          artistId: "a1",
          artistName: "Radiohead",
          createdAt: new Date(),
          lastIngestedAt: null,
          isIngesting: false,
        },
      ],
    });

    render(<Artists />);
    expect(screen.getByText("Never ingested")).toBeInTheDocument();
  });

  it("shows Last ingested with relative time when artist has ingestion runs", () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 2);
    mockUseLoaderData.mockReturnValue({
      follows: [
        {
          followId: "f1",
          artistId: "a1",
          artistName: "Radiohead",
          createdAt: new Date(),
          lastIngestedAt: pastDate,
          isIngesting: false,
        },
      ],
    });

    render(<Artists />);
    expect(screen.getByText(/Last ingested:/)).toBeInTheDocument();
  });

  it("shows Ingesting badge when artist is currently being ingested", () => {
    mockUseLoaderData.mockReturnValue({
      follows: [
        {
          followId: "f1",
          artistId: "a1",
          artistName: "Radiohead",
          createdAt: new Date(),
          lastIngestedAt: null,
          isIngesting: true,
        },
      ],
    });

    render(<Artists />);
    expect(screen.getByText("Ingesting...")).toBeInTheDocument();
  });
});
