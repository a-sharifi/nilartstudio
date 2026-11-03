/** Permit only exact payment start URLs returned by our supported providers. */
export function checkedGatewayUrl(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash) throw new Error('gateway');
  if (url.origin === 'https://gateway.zibal.ir' && /^\/start\/[1-9][0-9]{0,18}$/.test(url.pathname)) return url.href;
  if (url.origin === 'https://sandbox.zarinpal.com' && /^\/pg\/StartPay\/[A-Za-z0-9]{20,80}$/.test(url.pathname)) return url.href;
  throw new Error('gateway');
}
