export const supportFileType=(name:string)=>({png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",pdf:"application/pdf"} as Record<string,string>)[name.toLowerCase().split(".").pop()||""]
export async function readSupportFile(file:Pick<File,"name"|"type"|"size"|"arrayBuffer">){
 const name=file.name.trim(),type=supportFileType(name)
 if(!type||!file.size||file.size>5*1024*1024||name.length>200||/[\/\\\p{C}]/u.test(name)||file.type&&file.type!==type)throw new Error("invalid_attachment")
 const bytes=new Uint8Array(await file.arrayBuffer())
 const valid=type==="image/png"?[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n):type==="image/jpeg"?bytes[0]===255&&bytes[1]===216&&bytes[2]===255: new TextDecoder().decode(bytes.subarray(0,5))==="%PDF-"
 if(!valid)throw new Error("invalid_attachment")
 let binary="";for(let start=0;start<bytes.length;start+=8192)binary+=String.fromCharCode(...bytes.subarray(start,start+8192))
 return btoa(binary)
}
