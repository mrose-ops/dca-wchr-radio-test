'use strict';

const BASE_ROOM='DCAWCHR11F7901C';
const DEVICE_ID='TEST';

const byId=id=>document.getElementById(id);
let employee='';
let role='';

function personKey(name){
  return String(name||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,36);
}

function roomUrl(room,label){
  return 'https://vdo.ninja/?room='+encodeURIComponent(room)
    +'&miconly&autostart&cleanoutput&nosettings&novideobutton&nofileshare&nohangupbutton&label='
    +encodeURIComponent(label);
}

function inboxRoom(){return BASE_ROOM+'DISPATCHINBOX';}
function supervisorRoom(){return BASE_ROOM+'SUPERVISORS';}
function allStream(){return BASE_ROOM+'DISPATCHALL';}
function privateStream(){return BASE_ROOM+'PRIVATE'+personKey(employee);}

function setMessage(text,good){
  const el=byId('formMessage');
  el.textContent=text;
  el.style.color=good?'#86efac':'#fca5a5';
}

function configureView(frame){
  if(!frame)return;
  const apply=()=>{
    try{
      frame.contentWindow.postMessage({mute:false},'*');
      frame.contentWindow.postMessage({speaker:true},'*');
      frame.contentWindow.postMessage({volume:1},'*');
    }catch(e){}
  };
  frame.onload=()=>{apply();setTimeout(apply,500);setTimeout(apply,1500);};
}

function configureRoom(frame){
  if(!frame)return;
  const apply=()=>{
    try{
      frame.contentWindow.postMessage({mute:false},'*');
      frame.contentWindow.postMessage({speaker:true},'*');
      frame.contentWindow.postMessage({volume:1},'*');
      frame.contentWindow.postMessage({mic:false},'*');
    }catch(e){}
  };
  frame.onload=()=>{apply();setTimeout(apply,500);setTimeout(apply,1500);};
}

function enableRadioAudio(){
  ['dispatchAllView','privateView','supervisorFrame','dispatchTxFrame'].forEach(id=>{
    const f=byId(id);
    try{
      f.contentWindow.postMessage({mute:false},'*');
      f.contentWindow.postMessage({speaker:true},'*');
      f.contentWindow.postMessage({volume:1},'*');
    }catch(e){}
  });
  byId('radioStatus').innerHTML='<b>RADIO AUDIO ENABLED — listening</b>';
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(Ctx){
      const ctx=new Ctx();
      if(ctx.state==='suspended')ctx.resume();
    }
  }catch(e){}
}

function showStartScreen(){
  byId('startCard').classList.remove('hidden');
  byId('radioCard').classList.add('hidden');
  byId('shiftSummary').textContent='No employee signed in';
}

function showRadioScreen(){
  byId('startCard').classList.add('hidden');
  byId('radioCard').classList.remove('hidden');
  byId('shiftSummary').textContent=employee+' • '+(role==='SUPERVISOR'?'Supervisor':'WCHR Agent');
  byId('supervisorControls').classList.toggle('hidden',role!=='SUPERVISOR');
}

function loadRadio(){
  configureRoom(byId('dispatchAllView'));
  configureRoom(byId('privateView'));
  configureRoom(byId('supervisorFrame'));
  configureRoom(byId('dispatchTxFrame'));

  // EVERYONE (Agent + Supervisor) listens to ALL WCHR.
  byId('dispatchAllView').src=roomUrl(BASE_ROOM+'ALL',DEVICE_ID+'-'+personKey(employee)+'-LISTEN-ALL');

  // Every signed-in employee listens to their own private room.
  byId('privateView').src=roomUrl(BASE_ROOM+'PRIVATE'+personKey(employee),DEVICE_ID+'-'+personKey(employee)+'-PRIVATE');

  // Supervisors additionally listen to the supervisor-only room.
  if(role==='SUPERVISOR'){
    byId('supervisorFrame').src=roomUrl(BASE_ROOM+'SUPERVISORS',DEVICE_ID+'-'+personKey(employee)+'-SUPERVISOR');
  }else{
    byId('supervisorFrame').src='about:blank';
  }

  // EVERYONE talks back to Dispatch through the Dispatch Inbox room.
  byId('dispatchTxFrame').src=roomUrl(inboxRoom(),DEVICE_ID+'-'+personKey(employee)+'-TO-DISPATCH');

  byId('roomStatus').textContent=
    role==='SUPERVISOR'
      ?'Listening: ALL WCHR + Private + Supervisor • Can talk to Dispatch or ALL WCHR'
      :'Listening: ALL WCHR + Private • Can talk only to Dispatch';

  byId('radioStatus').innerHTML='<b>RADIO LOADED — tap ENABLE RADIO AUDIO</b>';
}

async function requestPhoneMicPermission(){
  try{
    const s=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}
    });
    s.getTracks().forEach(t=>t.stop());
    byId('radioStatus').innerHTML='<b>RADIO READY — listening</b>';
  }catch(e){
    byId('radioStatus').innerHTML='<b>MICROPHONE BLOCKED — allow mic in browser</b>';
  }
}

function startShift(){
  employee=String(byId('employeeName').value||'').trim();
  role=byId('employeeRole').value||'AGENT';
  if(!employee){
    setMessage('Enter your employee name first.',false);
    byId('employeeName').focus();
    return;
  }
  loadRadio();
  showRadioScreen();
  requestPhoneMicPermission();
}

function endShift(){
  employee='';role='';
  ['dispatchAllView','privateView','supervisorFrame','dispatchTxFrame'].forEach(id=>byId(id).src='about:blank');
  byId('employeeName').value='';
  byId('employeeRole').value='AGENT';
  showStartScreen();
  setMessage('Page ready.',true);
}

function post(frame,payload){
  try{if(frame&&frame.contentWindow)frame.contentWindow.postMessage(payload,'*');}catch(e){}
}

function bindPTT(button,frame,normalHtml){
  let active=false;
  function start(e){
    e.preventDefault();
    if(active)return;
    active=true;
    post(frame,{mic:true});
    button.classList.add('tx');
    button.textContent='TRANSMITTING…';
  }
  function stop(e){
    if(e)e.preventDefault();
    if(!active)return;
    active=false;
    post(frame,{mic:false});
    button.classList.remove('tx');
    button.innerHTML=normalHtml;
  }
  button.addEventListener('pointerdown',start);
  window.addEventListener('pointerup',stop);
  window.addEventListener('pointercancel',stop);
}

function showDiagnostics(){
  const lines=[
    'Version: v0.6.0 TEST',
    'Employee: '+employee,
    'Role: '+role,
    'ALL WCHR room: '+byId('dispatchAllView').src,
    'Private view: '+byId('privateView').src,
    'Inbox TX: '+byId('dispatchTxFrame').src,
    'Secure context: '+window.isSecureContext
  ];
  const box=byId('radioDiag');
  box.textContent=lines.join('\n');
  box.classList.toggle('hidden');
}

function init(){
  byId('employeeName').disabled=false;
  byId('employeeRole').disabled=false;
  byId('startShift').disabled=false;

  byId('startShift').addEventListener('click',startShift);
  byId('endShift').addEventListener('click',endShift);
  byId('showDiag').addEventListener('click',showDiagnostics);
  byId('enableAudio').addEventListener('click',enableRadioAudio);

  bindPTT(byId('pttDispatch'),byId('dispatchTxFrame'),'TALK TO<br>DISPATCH');
  bindPTT(byId('pttAll'),byId('dispatchAllView'),'TALK TO<br>ALL WCHR');

  setMessage('JavaScript loaded successfully.',true);
  showStartScreen();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
