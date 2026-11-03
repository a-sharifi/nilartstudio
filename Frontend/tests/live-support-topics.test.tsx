import {expect,test} from "vitest"
import {liveSupportTopics,validateSupport} from "../src/design/support"
test("live support accepts each persisted topic without a fixture order",()=>{
 expect(liveSupportTopics.map(topic=>topic[0])).toEqual(["general","account","product","commission","technical","other"])
 for(const [topic] of liveSupportTopics)expect(validateSupport({topic,order:"",item:"",subject:"Help with this issue",description:"A detailed request"},"owner",true)).toEqual({})
})
test("live support rejects invented topics and invalid draft references",()=>{
 expect(validateSupport({topic:"payment",order:"",item:"",subject:"Help",description:"Question"},"owner",true)).toHaveProperty("topic")
 expect(validateSupport({topic:"commission",order:"foreign-order",item:"",subject:"Help",description:"Question"},"owner",true)).toHaveProperty("order")
})
test("reference demo retains its order requirement for artwork topics",()=>{
 expect(validateSupport({topic:"art",order:"",item:"",subject:"Help",description:"Question"},"demo-customer")).toHaveProperty("order")
})
