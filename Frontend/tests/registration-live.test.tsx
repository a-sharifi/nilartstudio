import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import RegistrationPasswordPage from "../src/design/RegistrationPasswordPage";

afterEach(cleanup);

it("counts Unicode password characters like the Python backend", async () => {
  const complete = vi.fn().mockResolvedValue("service");
  const { container } = render(<RegistrationPasswordPage en suffix="" target={null}
    grant={{ demo: false, purpose: "register", maskedPhone: "+98•••123", token: "test-only", expiresAt: Date.now() + 600000 }}
    setGrant={() => {}} navigate={() => {}} resetFlow={() => {}} liveComplete={complete} />);
  const password = container.querySelector("#registration-password")!;
  const confirm = container.querySelector("#registration-confirm")!;
  fireEvent.change(password, { target: { value: "😀".repeat(6) } });
  fireEvent.change(confirm, { target: { value: "😀".repeat(6) } });
  fireEvent.submit(container.querySelector("form")!);
  expect(complete).not.toHaveBeenCalled();
  fireEvent.change(password, { target: { value: "😀".repeat(12) } });
  fireEvent.change(confirm, { target: { value: "😀".repeat(12) } });
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() => expect(complete).toHaveBeenCalledWith("😀".repeat(12)));
});
