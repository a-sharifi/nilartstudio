"use client"
import type {ReactNode} from "react"
import {useAccountAccess} from "../identity/use-account-access"
export default function CustomerWriteAccess({children}:{children:(canWrite:boolean)=>ReactNode}){
 const access=useAccountAccess()
 return children(access.status==="ready" && !!access.access?.permissions.includes("account.write_self"))
}
