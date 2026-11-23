/* Prototype configuration: leave empty until Nicolás confirms the business number. */
const SITE_CONFIG = Object.freeze({whatsappNumber: '',openingDate: '2026-12-12'});
const PACKAGES = Object.freeze({noche:'Noche en los árboles',suave:'Aventura suave',extrema:'Aventura extrema',orientacion:'Quiero orientación sobre la experiencia'});
function localDate(date=new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Tegucigalpa',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(part=>[part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function minimumArrival(today=localDate()) {return today>SITE_CONFIG.openingDate?today:SITE_CONFIG.openingDate;}
function nextDate(value) {const date=new Date(value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+1);return date.toISOString().slice(0,10);}
function validISODate(value) {if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;}
function formattedDate(value) {const [y,m,d]=value.split('-');return `${d}/${m}/${y}`;}
function validateInquiry(data,today=localDate()) {
  const errors=[];
  if(!Object.hasOwn(PACKAGES,data.package)) errors.push('Elige una de las experiencias disponibles en la propuesta.');
  if(!validISODate(data.arrival)) errors.push('Indica una fecha de llegada válida.');
  else if(data.arrival<today) errors.push('La llegada deseada no puede estar en el pasado.');
  else if(data.arrival<SITE_CONFIG.openingDate) errors.push('La llegada debe ser a partir de la apertura oficial, el 12 de diciembre de 2026.');
  if(!validISODate(data.departure)) errors.push('Indica una fecha de salida válida.');
  else if(validISODate(data.arrival)&&data.departure<=data.arrival) errors.push('La salida debe ser posterior a la llegada.');
  const people=Number(data.people);
  if(!Number.isInteger(people)||people<1||people>12)errors.push('Indica entre 1 y 12 personas. Para grupos más grandes, el equipo necesitará coordinar otra propuesta.');
  if(!String(data.name??'').trim())errors.push('Indica tu nombre para identificar la consulta.');
  else if(String(data.name).trim().length>80)errors.push('El nombre debe tener un máximo de 80 caracteres.');
  if(String(data.comments??'').length>800)errors.push('Los comentarios deben tener un máximo de 800 caracteres.');
  return errors;
}
function buildInquiry(data) {
  const people=Number(data.people);
  return `Hola, me interesa Glamping Aventura Park.\n\nSoy ${String(data.name).trim()}.\nExperiencia: ${PACKAGES[data.package]}.\nLlegada deseada: ${formattedDate(data.arrival)}.\nSalida deseada: ${formattedDate(data.departure)}.\nPersonas: ${people}.${people>3?'\nEs una consulta de grupo; necesito orientación sobre las unidades.':''}${String(data.comments??'').trim()?'\n\nMis comentarios: '+String(data.comments).trim():''}\n\nEntiendo que la apertura oficial es el 12 de diciembre de 2026 y que las fechas solicitadas dependen de disponibilidad y confirmación del equipo. Solicito información; no he realizado una reserva ni un pago.`;
}
if(typeof module!=='undefined'&&module.exports)module.exports={validateInquiry,buildInquiry,validISODate,localDate,minimumArrival};
if(typeof document!=='undefined'){
  const menu=document.querySelector('.menu-toggle'), nav=document.querySelector('#main-nav');
  function closeMenu(){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}
  menu.addEventListener('click',()=>{const open=!nav.classList.contains('open');nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));});
  nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus();}});
  document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeMenu();});
  const form=document.querySelector('#inquiry-form'), summary=document.querySelector('#inquiry-summary');
  const arrival=document.querySelector('#arrival'),departure=document.querySelector('#departure'), people=document.querySelector('#people');
  arrival.min=minimumArrival(); departure.min=nextDate(minimumArrival());
  function syncMinimum(){const start=validISODate(arrival.value)&&arrival.value>=minimumArrival()?arrival.value:minimumArrival();departure.min=nextDate(start);}
  arrival.addEventListener('change',syncMinimum);
  people.addEventListener('input',()=>{document.querySelector('#group-note').hidden=!(Number(people.value)>3);});
  document.querySelectorAll('[data-package]').forEach(link=>link.addEventListener('click',()=>{document.querySelector('#package').value=link.dataset.package;form.hidden=false;summary.hidden=true;document.querySelector('#form-errors').hidden=true;}));
  form.addEventListener('submit',e=>{
    e.preventDefault();const data=Object.fromEntries(new FormData(form));const errors=validateInquiry(data), errorBox=document.querySelector('#form-errors');
    errorBox.replaceChildren();
    if(errors.length){const ul=document.createElement('ul');errors.forEach(msg=>{const li=document.createElement('li');li.textContent=msg;ul.append(li);});errorBox.append(ul);errorBox.hidden=false;errorBox.setAttribute('tabindex','-1');errorBox.focus();return;}
    errorBox.hidden=true;document.querySelector('#summary-text').textContent=buildInquiry(data);document.querySelector('#group-summary').hidden=!(Number(data.people)>3);document.querySelector('#copy-status').textContent='';
    const wa=document.querySelector('#whatsapp-inquiry');const phone=SITE_CONFIG.whatsappNumber;
    if(/^\d{8,15}$/.test(phone)){wa.href='https://wa.me/'+phone+'?text='+encodeURIComponent(buildInquiry(data));wa.hidden=false;}else{wa.hidden=true;wa.removeAttribute('href');}
    form.hidden=true;summary.hidden=false;summary.focus();
  });
  document.querySelector('#edit-inquiry').addEventListener('click',()=>{summary.hidden=true;form.hidden=false;document.querySelector('#package').focus();});
  document.querySelector('#copy-inquiry').addEventListener('click',async()=>{
    const value=document.querySelector('#summary-text').textContent,status=document.querySelector('#copy-status');
    try{
      if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(value);
      else{
        const field=document.createElement('textarea'),previousFocus=document.activeElement;
        field.value=value;field.style.position='fixed';field.style.opacity='0';document.body.append(field);
        try{field.select();if(!document.execCommand('copy'))throw new Error('clipboard unavailable');}
        finally{field.remove();previousFocus?.focus({preventScroll:true});}
      }
      status.textContent='Consulta copiada. Todavía no se ha enviado.';
    }catch{status.textContent='Selecciona el texto del resumen y cópialo manualmente. Todavía no se ha enviado.';const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(document.querySelector('#summary-text'));selection.removeAllRanges();selection.addRange(range);}
  });
  form.hidden=false;
  document.querySelector('#inquiry-unavailable').hidden=true;
}
