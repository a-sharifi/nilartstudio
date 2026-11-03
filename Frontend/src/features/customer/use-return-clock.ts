"use client"
import {useEffect,useState} from "react"
/** Refresh at the recorded deadline and after background suspension; the server authorizes writes. */
export function useReturnClock(deadline?:string|null){
 const [now,setNow]=useState(()=>Date.now())
 useEffect(()=>{if(!deadline)return;const end=Date.parse(deadline);let timer:ReturnType<typeof setTimeout>|undefined
  const update=()=>{if(timer)clearTimeout(timer);const current=Date.now();setNow(current);if(Number.isFinite(end)&&end>=current)timer=setTimeout(update,Math.min(end-current+1,86400000))}
  update();window.addEventListener("focus",update);document.addEventListener("visibilitychange",update)
  return()=>{if(timer)clearTimeout(timer);window.removeEventListener("focus",update);document.removeEventListener("visibilitychange",update)}
 },[deadline])
 return now
}
