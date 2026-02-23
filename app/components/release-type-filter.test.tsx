import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-router", async () => {
  const actual =
    await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useSearchParams: vi.fn(),
  };
});

import { useSearchParams } from "react-router";
import { ReleaseTypeFilter } from "./release-type-filter";

const mockSetSearchParams = vi.fn();
const mockUseSearchParams = vi.mocked(useSearchParams);

describe("ReleaseTypeFilter", () => {
  beforeEach(() => {
    mockSetSearchParams.mockClear();
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams(),
      mockSetSearchParams,
    ] as never);
  });

  it("renders a filter button", () => {
    render(<ReleaseTypeFilter />);
    expect(
      screen.getByRole("button", { name: /all types/i }),
    ).toBeInTheDocument();
  });

  it("shows 'All types' label when no filter is active", () => {
    render(<ReleaseTypeFilter />);
    expect(screen.getByText(/all types/i)).toBeInTheDocument();
  });

  it("shows the count of selected types when filter is active", () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("types=album,single"),
      mockSetSearchParams,
    ] as never);

    render(<ReleaseTypeFilter />);
    expect(screen.getByText(/2 types/i)).toBeInTheDocument();
  });

  it("shows singular 'type' when one type selected", () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams("types=album"),
      mockSetSearchParams,
    ] as never);

    render(<ReleaseTypeFilter />);
    expect(screen.getByText(/1 type/i)).toBeInTheDocument();
  });
});
