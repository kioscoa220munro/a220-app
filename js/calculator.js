(()=> {
  const overlay=document.getElementById('a220Calculator');
  const display=document.getElementById('a220CalcDisplay');
  if(!overlay||!display)return;
  let lastResult=false;
  function open(){overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');display.focus();}
  function close(){overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');}
  function calculate(source){
    const input=source.replace(/,/g,'.').replace(/\s+/g,'');
    if(!input||!/^[0-9.+*/%()\-]+$/.test(input))throw new Error('Operación inválida');
    const tokens=input.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/%]/g)||[];
    if(tokens.join('')!==input)throw new Error('Operación inválida');
    let i=0;
    function primary(){
      const t=tokens[i++];
      if(t==='('){const v=expression();if(tokens[i++]!==')')throw new Error('Falta )');return v;}
      if(t==='+'||t==='-'){const v=primary();return t==='-'?-v:v;}
      if(t===undefined||!/^\d/.test(t)&&!/^\.\d/.test(t))throw new Error('Revisá la operación');
      const n=Number(t);if(!Number.isFinite(n))throw new Error('Número inválido');return n;
    }
    function term(){let v=primary();while(['*','/','%'].includes(tokens[i])){const op=tokens[i++],r=primary();if((op==='/'||op==='%')&&r===0)throw new Error('No se puede dividir por cero');v=op==='*'?v*r:op==='/'?v/r:v%r;}return v;}
    function expression(){let v=term();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],r=term();v=op==='+'?v+r:v-r;}return v;}
    const result=expression();if(i!==tokens.length||!Number.isFinite(result))throw new Error('Operación inválida');return result;
  }
  function press(key){
    if(key==='clear'){display.value='';lastResult=false;return;}
    if(key==='back'){display.value=display.value.slice(0,-1);lastResult=false;return;}
    if(key==='='){try{const n=calculate(display.value);display.value=String(Number(n.toPrecision(12)));lastResult=true;}catch(e){display.setCustomValidity(e.message);display.reportValidity();display.setCustomValidity('');}return;}
    if(lastResult&&/[0-9.(]/.test(key))display.value='';
    display.value+=key;lastResult=false;display.focus();
  }
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  overlay.querySelectorAll('[data-calc]').forEach(b=>b.addEventListener('click',()=>press(b.dataset.calc)));
  display.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key==='='){e.preventDefault();press('=');}else if(e.key==='Escape'){e.preventDefault();close();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('is-open'))close();});
  window.openA220Calculator=open;
  window.closeA220Calculator=close;
})();