'use strict';

const BASE_ROOM = 'DCAWCHR11F7901C';
const DEVICE_ID = 'TEST';

const byId = (id) => document.getElementById(id);
let employee = '';
let role = '';

function personKey(name) {
  return String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 36);
}

function room(kind) {
  if (kind === 'ALL') return BASE_ROOM + 'ALL';
  if (kind === 'INBOX') return BASE_ROOM + 'DISPATCHINBOX';
  if (kind === 'SUPERVISORS') return BASE_ROOM + 'SUPERVISORS';
  return BASE_ROOM + 'PRIVATE' + personKey(employee);
}

function vdoUrl(roomName, label) {
  return 'https://vdo.ninja/?room=' + encodeURIComponent(roomName)
    + '&miconly&autostart&cleanoutput&mutespeaker=0&nosettings&novideobutton&nofileshare&nohangupbutton&label='
    + encodeURIComponent(label);
}

function configureRadioFrame(frame) {
  if (!frame) return;
  const apply = () => {
    try {
      frame.contentWindow.postMessage({speaker:true}, '*');
      frame.contentWindow.postMessage({mute:false}, '*');
      frame.contentWindow.postMessage({volume:1}, '*');
      frame.contentWindow.postMessage({mic:false}, '*');
    } catch (err) {}
  };
  frame.onload = () => {
    apply();
    setTimeout(apply, 500);
    setTimeout(apply, 1500);
  };
}

function enableRadioAudio() {
  const frames = [
    byId('listenAllFrame'),
    byId('listenPrivateFrame'),
    byId('listenSupervisorFrame'),
    byId('dispatchTxFrame')
  ];
  frames.forEach(frame => {
    try {
      frame.contentWindow.postMessage({speaker:true}, '*');
      frame.contentWindow.postMessage({mute:false}, '*');
      frame.contentWindow.postMessage({volume:1}, '*');
      frame.contentWindow.postMessage({mic:false}, '*');
    } catch (err) {}
  });

  const status = byId('radioStatus');
  status.innerHTML = '<b>RADIO AUDIO ENABLED — listening</b>';

  // A tiny user-gesture-created audio context helps Android Chrome authorize playback.
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      const ctx = new Ctx();
      if (ctx.state === 'suspended') ctx.resume();
    }
  } catch (err) {}
}

function setMessage(text, good) {
  const el = byId('formMessage');
  el.textContent = text;
  el.style.color = good ? '#86efac' : '#fca5a5';
}

function showStartScreen() {
  byId('startCard').classList.remove('hidden');
  byId('radioCard').classList.add('hidden');
  byId('shiftSummary').textContent = 'No employee signed in';
}

function showRadioScreen() {
  byId('startCard').classList.add('hidden');
  byId('radioCard').classList.remove('hidden');
  byId('shiftSummary').textContent =
    employee + ' • ' + (role === 'SUPERVISOR' ? 'Supervisor' : 'WCHR Agent');

  // Agents only get TALK TO DISPATCH.
  // Supervisors additionally get TALK TO ALL WCHR.
  byId('supervisorControls').classList.toggle('hidden', role !== 'SUPERVISOR');
}

function loadRadioRooms() {
  configureRadioFrame(byId('listenAllFrame'));
  configureRadioFrame(byId('listenPrivateFrame'));
  configureRadioFrame(byId('listenSupervisorFrame'));
  configureRadioFrame(byId('dispatchTxFrame'));

  // Every signed-in employee LISTENS to ALL WCHR broadcasts.
  byId('listenAllFrame').src =
    vdoUrl(room('ALL'), DEVICE_ID + '-' + personKey(employee) + '-LISTEN-ALL');

  // Every employee listens to their own private room so Dispatch can
  // speak to that one person without others hearing.
  byId('listenPrivateFrame').src =
    vdoUrl(room('PRIVATE'), DEVICE_ID + '-' + personKey(employee) + '-PRIVATE');

  // Supervisors also listen to the supervisor channel.
  if (role === 'SUPERVISOR') {
    byId('listenSupervisorFrame').src =
      vdoUrl(room('SUPERVISORS'), DEVICE_ID + '-' + personKey(employee) + '-SUPERVISOR');
  } else {
    byId('listenSupervisorFrame').src = 'about:blank';
  }

  // Agent/Supervisor -> Dispatch always transmits into Dispatch Inbox.
  byId('dispatchTxFrame').src =
    vdoUrl(room('INBOX'), DEVICE_ID + '-' + personKey(employee) + '-TO-DISPATCH');

  byId('roomStatus').textContent =
    role === 'SUPERVISOR'
      ? 'Listening: ALL WCHR + Private + Supervisor • Can talk to Dispatch or ALL WCHR'
      : 'Listening: ALL WCHR + Private • Can talk only to Dispatch';

  byId('radioStatus').innerHTML =
    '<b>RADIO LOADED — allow microphone if prompted</b>';
}

function startShift() {
  const nameInput = byId('employeeName');
  const roleSelect = byId('employeeRole');

  employee = String(nameInput.value || '').trim();
  role = roleSelect.value || 'AGENT';

  if (!employee) {
    setMessage('Enter your employee name before starting the shift.', false);
    nameInput.focus();
    return;
  }

  loadRadioRooms();
  showRadioScreen();
  setTimeout(enableRadioAudio, 1200);
}

function endShift() {
  employee = '';
  role = '';

  [
    'listenAllFrame',
    'listenPrivateFrame',
    'listenSupervisorFrame',
    'dispatchTxFrame'
  ].forEach(id => byId(id).src = 'about:blank');

  byId('employeeName').value = '';
  byId('employeeRole').value = 'AGENT';
  showStartScreen();
  setMessage('Page ready. Name field and role selector are active.', true);
}

function post(frame, payload) {
  try {
    if (frame && frame.contentWindow) frame.contentWindow.postMessage(payload, '*');
  } catch (err) {}
}

function bindPTT(button, frame, normalHtml) {
  let active = false;

  function start(event) {
    event.preventDefault();
    if (active) return;
    active = true;
    post(frame, {PPT:true});
    post(frame, {mic:true});
    button.classList.add('tx');
    button.textContent = 'TRANSMITTING…';
  }

  function stop(event) {
    if (event) event.preventDefault();
    if (!active) return;
    active = false;
    post(frame, {PPT:false});
    post(frame, {mic:false});
    button.classList.remove('tx');
    button.innerHTML = normalHtml;
  }

  button.addEventListener('pointerdown', start);
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
}

function showDiagnostics() {
  const data = [
    'Version: v0.3.2 TEST',
    'Device: ' + DEVICE_ID,
    'Employee: ' + (employee || '(none)'),
    'Role: ' + (role || '(none)'),
    'Listening ALL: ' + (byId('listenAllFrame').src || '(blank)'),
    'Listening Private: ' + (byId('listenPrivateFrame').src || '(blank)'),
    'Listening Supervisor: ' + (byId('listenSupervisorFrame').src || '(blank)'),
    'Talk to Dispatch: ' + (byId('dispatchTxFrame').src || '(blank)'),
    'Supervisor Talk All: uses Listening ALL frame (single connection)',
    'Secure context: ' + window.isSecureContext
  ].join('\n');

  const box = byId('radioDiag');
  box.textContent = data;
  box.classList.toggle('hidden');
}

function init() {
  const nameInput = byId('employeeName');
  const roleSelect = byId('employeeRole');

  nameInput.disabled = false;
  roleSelect.disabled = false;
  byId('startShift').disabled = false;

  byId('startShift').addEventListener('click', startShift);
  byId('endShift').addEventListener('click', endShift);
  byId('showDiag').addEventListener('click', showDiagnostics);
  byId('enableAudio').addEventListener('click', enableRadioAudio);

  bindPTT(byId('pttDispatch'), byId('dispatchTxFrame'), 'TALK TO<br>DISPATCH');
  bindPTT(byId('pttAll'), byId('listenAllFrame'), 'TALK TO<br>ALL WCHR');

  nameInput.addEventListener('input', () =>
    setMessage('Name entered. Select role and press START SHIFT.', true)
  );
  roleSelect.addEventListener('change', () =>
    setMessage(
      'Role selected: ' + roleSelect.options[roleSelect.selectedIndex].text,
      true
    )
  );

  setMessage(
    'JavaScript loaded successfully. Name field and role selector are active.',
    true
  );
  showStartScreen();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
