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
});
