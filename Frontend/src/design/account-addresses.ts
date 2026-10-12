import { cleanAddress, addressErrors, type Address } from "./address"
export type AddressesMode = "normal" | "empty" | "loading" | "network" | "save-error" | "delete-error" | "default-error" | "conflict" | "city-error" | "unsupported" | "denied"
// These reducers update only the account address book, not a checkout selection or order snapshot.
export function saveAccountAddress(
  addresses: Address[],
  draft: Address,
  newId: string,
) {
  if (Object.keys(addressErrors(draft)).length)
    return { addresses, error: "validation" }
  const old = addresses.find((address) => address.id === draft.id)
  if (draft.id && (!old || old.version !== draft.version))
    return { addresses, error: "conflict" }
  const saved = {
    ...cleanAddress(draft),
    id: draft.id || newId,
    version: draft.version + 1,
  }
  const next = old
    ? addresses.map((address) => (address.id === saved.id ? saved : address))
    : [...addresses, saved]
  return {
    addresses: next.map((address) =>
      saved.default && address.id !== saved.id
        ? {
            ...address,
            default: false,
            version: address.default ? address.version + 1 : address.version,
          }
        : address,
    ),
    error: null,
  }
}
export function defaultAccountAddress(
  addresses: Address[],
  id: string,
  version: number,
) {
  const target = addresses.find((address) => address.id === id)
  if (!target || target.version !== version)
    return { addresses, error: "conflict" }
  return {
    addresses: addresses.map((address) => ({
      ...address,
      default: address.id === id,
      version:
        address.default !== (address.id === id)
          ? address.version + 1
          : address.version,
    })),
    error: null,
  }
}
export function deleteAccountAddress(
  addresses: Address[],
  id: string,
  version: number,
) {
  const target = addresses.find((address) => address.id === id)
  if (!target || target.version !== version)
    return { addresses, error: "conflict" }
  return {
    addresses: addresses.filter((address) => address.id !== id),
    error: null,
  }
}
export function checkoutReturnTarget(search: string) {
  const value = new URLSearchParams(search).get("returnTo")
  // Fixed internal allowlist. Do not carry recipient details, arbitrary queries or an external URL.
  return value &&
    ["/checkout", "/checkout/address", "/checkout/delivery"].includes(value)
    ? value
    : null
}
