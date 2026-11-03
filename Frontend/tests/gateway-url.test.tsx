import { expect, it } from 'vitest';
import { checkedGatewayUrl } from '../src/features/payments/gateway-url';
it('accepts exact Zibal and legacy sandbox destinations',()=>{
 expect(checkedGatewayUrl('https://gateway.zibal.ir/start/1234567')).toBe('https://gateway.zibal.ir/start/1234567');
 expect(checkedGatewayUrl('https://sandbox.zarinpal.com/pg/StartPay/'+'A'.repeat(36))).toContain('zarinpal');
});
it.each(['https://gateway.zibal.ir.evil.com/start/123','http://gateway.zibal.ir/start/123','https://gateway.zibal.ir/start/123?next=evil','https://user@gateway.zibal.ir/start/123','https://gateway.zibal.ir/start/abc','javascript:alert(1)'])('rejects unsafe gateway destination %s',url=>expect(()=>checkedGatewayUrl(url)).toThrow());
