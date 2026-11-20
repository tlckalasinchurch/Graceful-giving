import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Privacy from "./Privacy";

describe("Privacy page", () => {
  it("mounts with the PDPA policy heading", () => {
    render(<Privacy />);
    expect(
      screen.getByRole("heading", { name: "นโยบายความเป็นส่วนตัว (PDPA)" })
    ).toBeTruthy();
  });
});
