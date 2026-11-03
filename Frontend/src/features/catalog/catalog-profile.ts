import {useEffect,useState} from 'react'
import {profileContent,type ProfileContent,type ProfileKind} from '../admin/catalog-profile-api'
export function useCatalogProfile(kind:ProfileKind,id?:string){
 const [revision,setRevision]=useState(0),[state,setState]=useState<{key?:string;content:ProfileContent|null;error:boolean}>({content:null,error:false})
 useEffect(()=>{if(!id)return;const controller=new AbortController();let active=true;const timer=setTimeout(()=>{controller.abort();if(active)setState({key:id,content:null,error:true})},15000);void fetch(`/api/v1/catalog/profiles/${kind}/${id}`,{cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}}).then(async r=>{if(r.status===404)return null;if(!r.ok)throw Error('profile_unavailable');return profileContent.parse(await r.json())}).then(content=>{if(active&&!controller.signal.aborted)setState({key:id,content,error:false})}).catch(()=>{if(active&&!controller.signal.aborted)setState({key:id,content:null,error:true})}).finally(()=>clearTimeout(timer));return()=>{active=false;clearTimeout(timer);controller.abort()}},[kind,id,revision])
 return {...(state.key===id?state:{content:null,error:false}),retry:()=>setRevision(v=>v+1)}
}
