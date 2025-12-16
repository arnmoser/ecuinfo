/* utils.js - Funções auxiliares */
export function uid(prefix='id'){
  return prefix + '_' + Math.random().toString(36).slice(2,9);
}

export function fileToDataURL(file){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}