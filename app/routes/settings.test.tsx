import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
import Settings from "./settings";

const mockUseLoaderData = vi.mocked(useLoaderData);
const mockUseActionData = vi.mocked(useActionData);

const mockUser = {
  id: "u1",
  name: "Alice",
  email: "alice@example.com",
  locationCity: "London",
  locationRegion: "England",
  locationCountry: "UK",
  locationLat: 51.5,
  locationLng: -0.12,
  locationRadiusKm: 50,
};

describe("Settings", () => {
  beforeEach(() => {
    mockUseActionData.mockReturnValue(undefined);
  });

  it("renders current location in form fields", () => {
    mockUseLoaderData.mockReturnValue({ user: mockUser });

    render(<Settings />);
    expect(screen.getByLabelText(/city/i)).toHaveValue("London");
    expect(screen.getByLabelText(/region/i)).toHaveValue("England");
    expect(screen.getByLabelText(/country/i)).toHaveValue("UK");
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(51.5);
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(-0.12);
  });

  it("renders a save button", () => {
    mockUseLoaderData.mockReturnValue({ user: mockUser });

    render(<Settings />);
    expect(
      screen.getByRole("button", { name: /save/i }),
    ).toBeInTheDocument();
  });

  it("renders empty fields when no location is set", () => {
    mockUseLoaderData.mockReturnValue({
      user: {
        ...mockUser,
        locationCity: null,
        locationRegion: null,
        locationCountry: null,
        locationLat: null,
        locationLng: null,
        locationRadiusKm: 50,
      },
    });

    render(<Settings />);
    expect(screen.getByLabelText(/city/i)).toHaveValue("");
  });

  it("shows success message from action data", () => {
    mockUseLoaderData.mockReturnValue({ user: mockUser });
    mockUseActionData.mockReturnValue({ success: true });

    render(<Settings />);
    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });

  it("shows error message from action data", () => {
    mockUseLoaderData.mockReturnValue({ user: mockUser });
    mockUseActionData.mockReturnValue({ error: "City is required" });

    render(<Settings />);
    expect(screen.getByText("City is required")).toBeInTheDocument();
  });

  describe("ingestion trigger", () => {
    it("renders a Run Ingestion button", () => {
      mockUseLoaderData.mockReturnValue({ user: mockUser });

      render(<Settings />);
      expect(
        screen.getByRole("button", { name: /run ingestion/i }),
      ).toBeInTheDocument();
    });

    it("shows summary after successful ingestion", async () => {
      mockUseLoaderData.mockReturnValue({ user: mockUser });
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          summary: {
            artistsProcessed: 3,
            totalInserted: 12,
            totalSkippedDupes: 2,
            totalSkippedLowConfidence: 1,
            totalErrors: 0,
          },
        }),
      });

      render(<Settings />);
      await user.click(screen.getByRole("button", { name: /run ingestion/i }));

      expect(await screen.findByText(/3 artists processed/i)).toBeInTheDocument();
      expect(screen.getByText(/12 items inserted/i)).toBeInTheDocument();
    });

    it("shows error message when ingestion fails", async () => {
      mockUseLoaderData.mockReturnValue({ user: mockUser });
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<Settings />);
      await user.click(screen.getByRole("button", { name: /run ingestion/i }));

      expect(await screen.findByText(/ingestion failed/i)).toBeInTheDocument();
    });

    it("disables the button while ingestion is running", async () => {
      mockUseLoaderData.mockReturnValue({ user: mockUser });
      const user = userEvent.setup();

      let resolvePromise: (value: unknown) => void;
      global.fetch = vi.fn().mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
      );

      render(<Settings />);
      const button = screen.getByRole("button", { name: /run ingestion/i });
      await user.click(button);

      expect(button).toBeDisabled();
      expect(button).toHaveTextContent(/running/i);

      resolvePromise!({
        ok: true,
        json: async () => ({
          summary: {
            artistsProcessed: 0,
            totalInserted: 0,
            totalSkippedDupes: 0,
            totalSkippedLowConfidence: 0,
            totalErrors: 0,
          },
        }),
      });
    });
  });
});
