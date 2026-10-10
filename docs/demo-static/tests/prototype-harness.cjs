const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
module.exports=function harness(){
  const elements={},listeners={},web=path.resolve(__dirname,'../web');
  const context=vm.createContext({structuredClone,URLSearchParams,TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,Buffer,console,crypto:require('node:crypto').webcrypto,setTimeout:()=>0,clearTimeout:()=>{},location:{hash:''},window:{scrollTo(){},addEventListener(){}},document:{body:{dataset:{}},querySelector(s){return elements[s]??={innerHTML:'',textContent:'',value:'',classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},showModal(){},close(){}}},addEventListener(name,fn){(listeners[name]??=[]).push(fn)}}});
  for(const file of ['implementation-contract.js','patient-import-files.js','patient-import.js','quality-wecom.js','platform-prototype.js','screening-sheet-data.js','screening-sheet.js','screening-cycle.js','screening-import.js','care-cycle.js','journey.js','interactive.js','after-care-service.js','service-navigation.js','screening-center.js'])vm.runInContext(fs.readFileSync(path.join(web,file),'utf8'),context,{filename:file});
  return {run:s=>vm.runInContext(s,context),elements,listeners,context};
};
