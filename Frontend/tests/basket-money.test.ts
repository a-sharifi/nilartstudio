import {expect,it} from "vitest"
import {addAmounts,basketMoney,differenceAmount,multiplyAmount,tomanAmount} from "../src/features/basket/money"
it("keeps basket prices, fractions and currency conversions exact",()=>{
 expect(multiplyAmount("123456789012345678.1234567",3)).toBe("370370367037037034.3703701")
 expect(differenceAmount("0.3000001","0.2")).toBe("0.1000001")
 expect(addAmounts("0.1","0.2")).toBe("0.3")
 expect(tomanAmount("123.456789","IRR")).toBe("12.3456789")
 expect(basketMoney("125000.5",0,2)).toBe("۲۵۰٬۰۰۱ تومان")
})
