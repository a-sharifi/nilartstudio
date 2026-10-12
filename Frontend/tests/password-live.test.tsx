import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import PasswordForm from "../src/design/PasswordForm";

afterEach(cleanup);

it("uses the design form but disables preview success and submits live credentials", async () => {
  const signIn = vi.fn().mockResolvedValue("incorrect");
  function Form() {
    const [phone, setPhone] = useState("");
    const [country, setCountry] = useState("IR");
    return <PasswordForm en suffix="" navigate={() => {}} onContext={() => {}}
      phone={phone} setPhone={setPhone} country={country} setCountry={setCountry} liveSignIn={signIn} />;
  }
  const { container } = render(<Form />);
  expect(container.querySelector(".password-preview")).toBeNull();
  expect(container.querySelector(".password-demo")).toBeNull();
  fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "09123456789" } });
  fireEvent.change(container.querySelector("#login-password")!, { target: { value: "wrong password" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(signIn).toHaveBeenCalledWith("09123456789", "wrong password"));
  await waitFor(() => expect(screen.getByText("The phone number or password is incorrect.")).toBeTruthy());
  expect((container.querySelector("#login-password") as HTMLInputElement).value).toBe("");
  expect(screen.getByRole("button", { name: /SMS sign-in/ }).hasAttribute("disabled")).toBe(true);
});
