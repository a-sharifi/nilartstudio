import { normalizeDigits } from './checkout'
export interface Address {
  id: string
  name: string
  phone: string
  province: string
  city: string
  street: string
  postal: string
  label: string
  default: boolean
  version: number
}
export interface AddressCheckout {
  addresses: Address[]
  selectedAddressId: string | null
  shippingQuote: { addressId: string; amount: number } | null
}
// Local fixtures only. No production customer data or external address service.
export const addressCountry = {
  id: 'IR', name: ['ایران', 'Iran'], code: '+98',
  phone: /^9\d{9}$/, postal: /^\d{10}$/,
  provinces: [
    { id: 'tehran', name: ['تهران', 'Tehran'], cities: [{ id: 'tehran', name: ['تهران', 'Tehran'] }, { id: 'rey', name: ['ری', 'Rey'] }] },
    { id: 'isfahan', name: ['اصفهان', 'Isfahan'], cities: [{ id: 'isfahan', name: ['اصفهان', 'Isfahan'] }, { id: 'kashan', name: ['کاشان', 'Kashan'] }] },
    { id: 'fars', name: ['فارس', 'Fars'], cities: [{ id: 'shiraz', name: ['شیراز', 'Shiraz'] }] },
  ],
}
export const emptyAddress = (): Address => ({ id: '', name: '', phone: '', province: '', city: '', street: '', postal: '', label: '', default: false, version: 0 })
export const demoAddresses = (): AddressCheckout => ({
  addresses: [
    { ...emptyAddress(), id: 'demo-home', name: 'گیرنده نمونه', phone: '9000000000', province: 'tehran', city: 'tehran', street: 'نشانی نمایشی — خیابان نمونه، کوچه هنر، ساختمان نمونه، واحد ۲. برای ارسال واقعی استفاده نشود.', postal: '0000000000', label: 'خانه', default: true, version: 1 },
    { ...emptyAddress(), id: 'demo-work', name: 'گیرنده دوم نمونه', phone: '9000000001', province: 'isfahan', city: 'isfahan', street: 'نشانی نمایشی — خیابان نمونه، کارگاه هنر، ساختمان نمونه، طبقه اول. برای ارسال واقعی استفاده نشود.', postal: '0000000001', label: 'محل کار', version: 1 },
  ], selectedAddressId: 'demo-home', shippingQuote: null,
})
export function cleanAddress(a: Address): Address {
  let phone = normalizeDigits(a.phone).replace(/[\s()-]/g, '')
  if (phone.startsWith('+98')) phone = phone.slice(3)
  if (phone.startsWith('0')) phone = phone.slice(1)
  return { ...a, name: a.name.trim().replace(/\s+/g, ' '), street: a.street.trim(), label: a.label.trim(), phone, postal: normalizeDigits(a.postal).trim() }
}
export function addressErrors(a: Address) {
  const v = cleanAddress(a)
  const errors: Partial<Record<keyof Address, 'required' | 'phone' | 'postal'>> = {}
  for (const key of ['name', 'phone', 'province', 'city', 'street', 'postal'] as const) if (!v[key]) errors[key] = 'required'
  if (v.phone && !addressCountry.phone.test(v.phone)) errors.phone = 'phone'
  if (v.postal && !addressCountry.postal.test(v.postal)) errors.postal = 'postal'
  if (!addressCountry.provinces.find(p => p.id === v.province)?.cities.some(c => c.id === v.city)) errors.city = 'required'
  return errors
}
export function selectDestination(state: AddressCheckout, id: string | null): AddressCheckout {
  return { ...state, selectedAddressId: id, shippingQuote: id === state.selectedAddressId ? state.shippingQuote : null }
}
export function saveDestination(state: AddressCheckout, draft: Address): AddressCheckout {
  const editing = state.addresses.some(a => a.id === draft.id)
  const saved = { ...cleanAddress(draft), id: draft.id || `local-${Date.now()}`, version: draft.version + 1 }
  const addresses = editing ? state.addresses.map(a => a.id === saved.id ? saved : a) : [...state.addresses, saved]
  return { addresses: addresses.map(a => saved.default && a.id !== saved.id ? { ...a, default: false } : a), selectedAddressId: editing ? state.selectedAddressId : saved.id, shippingQuote: !editing || state.selectedAddressId === saved.id ? null : state.shippingQuote }
}
