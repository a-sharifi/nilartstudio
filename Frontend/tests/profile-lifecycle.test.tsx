import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ProfilePage from "../src/design/ProfilePage";
import type { ProfileRecord } from "../src/design/profile";

afterEach(cleanup);

function profile(owner: string, fullName: string, version = 1): ProfileRecord {
  return { owner, fullName, version, phone: "+989123456789", phoneVerified: true,
    email: null, emailVerified: false };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function show(liveApi: { load(): Promise<ProfileRecord>; save(): Promise<ProfileRecord> }) {
  return render(<ProfilePage page="/en/account/profile" navigate={() => {}}
    registerGuard={() => {}} liveApi={liveApi} />);
}

it("ignores an initial profile response after a newer account check", async () => {
  const old = deferred<ProfileRecord>();
  const load = vi.fn().mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce(profile("new-owner", "Current customer"));
  show({ load, save: vi.fn() });
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(screen.getByLabelText(/^Full name/)).toHaveProperty("value", "Current customer"));
  await act(async () => { old.resolve(profile("old-owner", "Previous customer")); });
  expect(screen.getByLabelText(/^Full name/)).toHaveProperty("value", "Current customer");
});

it("ignores a delayed save after switching accounts", async () => {
  const saved = deferred<ProfileRecord>();
  const load = vi.fn().mockResolvedValueOnce(profile("old-owner", "Previous customer"))
    .mockResolvedValueOnce(profile("new-owner", "Current customer"));
  const save = vi.fn().mockReturnValue(saved.promise);
  show({ load, save });
  const input = await screen.findByLabelText(/^Full name/);
  fireEvent.change(input, { target: { value: "Old account edit" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(screen.getByLabelText(/^Full name/)).toHaveProperty("value", "Current customer"));
  await act(async () => { saved.resolve(profile("old-owner", "Old account edit", 2)); });
  expect(screen.getByLabelText(/^Full name/)).toHaveProperty("value", "Current customer");
  expect(screen.queryByText("Your profile has been saved.")).toBeNull();
});

it("clears private state on denial and ignores a pending save", async () => {
  const saved = deferred<ProfileRecord>();
  const load = vi.fn().mockResolvedValueOnce(profile("owner", "Private customer"))
    .mockRejectedValueOnce(new Error("denied"));
  const save = vi.fn().mockReturnValue(saved.promise);
  const { container } = show({ load, save });
  fireEvent.change(await screen.findByLabelText(/^Full name/), { target: { value: "Private edit" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  fireEvent(window, new Event("focus"));
  await screen.findByText("This account’s profile is not accessible.");
  await act(async () => { saved.resolve(profile("owner", "Private edit", 2)); });
  expect(container.textContent).not.toContain("Private customer");
  expect(container.textContent).not.toContain("Private edit");
  expect(screen.queryByLabelText(/^Full name/)).toBeNull();
  expect(screen.queryByText("Your profile has been saved.")).toBeNull();
});

it("recovers from a temporary read failure without discarding the draft", async () => {
  const load = vi.fn().mockResolvedValueOnce(profile("owner", "Server customer"))
    .mockRejectedValueOnce(new Error("service"))
    .mockResolvedValueOnce(profile("owner", "Server customer"));
  show({ load, save: vi.fn() });
  fireEvent.change(await screen.findByLabelText(/^Full name/), { target: { value: "Unsaved edit" } });
  fireEvent(window, new Event("focus"));
  await screen.findByText("Unable to load your profile.");
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(screen.getByLabelText(/^Full name/)).toHaveProperty("value", "Unsaved edit"));
});

it("an explicit read retry preserves unsaved edits", async () => {
  const load = vi.fn().mockResolvedValueOnce(profile("owner", "Server customer"))
    .mockRejectedValueOnce(new Error("service"))
    .mockResolvedValueOnce(profile("owner", "Server customer"));
  show({ load, save: vi.fn() });
  fireEvent.change(await screen.findByLabelText(/^Full name/), { target: { value: "Unsaved edit" } });
  fireEvent(window, new Event("focus"));
  await screen.findByText("Unable to load your profile.");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(screen.getByLabelText(/^Full name/)).toHaveProperty("value", "Unsaved edit"));
});

it("a newer focus check completes conflict review while an older read is pending", async () => {
  const oldRead = deferred<ProfileRecord>();
  const load = vi.fn().mockResolvedValueOnce(profile("owner", "Original name"))
    .mockReturnValueOnce(oldRead.promise)
    .mockResolvedValueOnce(profile("owner", "Latest name", 3));
  show({ load, save: vi.fn().mockRejectedValue(new Error("conflict")) });
  fireEvent.change(await screen.findByLabelText(/^Full name/), { target: { value: "Unsaved edit" } });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  fireEvent(window, new Event("focus"));
  await screen.findByRole("button", { name: "Load latest version" });
  await act(async () => { oldRead.resolve(profile("owner", "Outdated name", 2)); });
  expect(screen.getByLabelText(/^Full name/)).toHaveProperty("value", "Unsaved edit");
  fireEvent.click(screen.getByRole("button", { name: "Load latest version" }));
  expect(screen.getByLabelText(/^Full name/)).toHaveProperty("value", "Latest name");
});
