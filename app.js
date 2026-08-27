'use strict';

const BASE_ROOM = 'DCAWCHR11F7901C';
const DEVICE_ID = 'TEST';

const byId = (id) => document.getElementById(id);
let employee = '';
let role = '';

function personKey(name) {
  return String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 36);
}

function vdoUrl(room, label) {
  return 'https://vdo.ninja/?room=' + encodeURIComponent(room)
    + '&miconly&autostart&mute&cleanoutput&nosettings&novideobutton&nofileshare&nohangupbutton&label='
    + encodeURIComponent(label);
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
  byId('shiftSummary').textContent = employee + ' • ' + (role === 'SUPERVISOR' ? 'Supervisor' : 'WCHR Agent');
}

function startRadio() {
  const privateRoom = BASE_ROOM + 'PRIVATE' + personKey(employee);
  const groupRoom = role === 'SUPERVISOR' ? BASE_ROOM + 'SUPERVISORS' : BASE_ROOM + 'ALL';

  byId('privateFrame').src = vdoUrl(privateRoom, DEVICE_ID + '-' + personKey(employee) + '-PRIVATE');
  byId('groupFrame').src = vdoUrl(groupRoom, DEVICE_ID + '-' + personKey(employee) + '-GROUP');

  byId('groupLabel').textContent = role === 'SUPERVISOR' ? 'SUPERVISORS' : 'ALL WCHR';
  byId('roomStatus').textContent = 'Private Dispatch channel + ' + (role === 'SUPERVISOR' ? 'Supervisor channel' : 'All-WCHR channel');
  byId('radioStatus').innerHTML = '<b>RADIO LOADED — allow microphone if prompted</b>';
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

  setMessage('Shift started.', true);
  startRadio();
  showRadioScreen();
}

function endShift() {
  employee = '';
  role = '';
  byId('privateFrame').src = 'about:blank';
  byId('groupFrame').src = 'about:blank';
  byId('employeeName').value = '';
  byId('employeeRole').value = 'AGENT';
  showStartScreen();
  setMessage('Page ready. Name field and role selector should be active.', true);
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
    button.innerHTML = typeof normalHtml === 'function' ? normalHtml() : normalHtml;
  }

  button.addEventListener('pointerdown', start);
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
}

function showDiagnostics() {
  const data = [
    'Version: v0.2.0 TEST',
    'Device: ' + DEVICE_ID,
    'Employee: ' + (employee || '(none)'),
    'Role: ' + (role || '(none)'),
    'Private frame: ' + (byId('privateFrame').src || '(blank)'),
    'Group frame: ' + (byId('groupFrame').src || '(blank)'),
    'Secure context: ' + window.isSecureContext,
    'Pointer events: ' + ('PointerEvent' in window)
  ].join('\n');
  const box = byId('radioDiag');
  box.textContent = data;
  box.classList.toggle('hidden');
}

function init() {
  const nameInput = byId('employeeName');
  const roleSelect = byId('employeeRole');
  const startButton = byId('startShift');

  if (!nameInput || !roleSelect || !startButton) {
    document.body.innerHTML = '<div style="padding:20px;color:white;background:#7f1d1d">Phone app failed to initialize.</div>';
    return;
  }

  nameInput.disabled = false;
  roleSelect.disabled = false;
  startButton.disabled = false;

  startButton.addEventListener('click', startShift);
  byId('endShift').addEventListener('click', endShift);
  byId('showDiag').addEventListener('click', showDiagnostics);

  bindPTT(byId('pttPrivate'), byId('privateFrame'), 'TALK TO<br>DISPATCH');
  bindPTT(byId('pttGroup'), byId('groupFrame'), () => 'TALK TO<br><span id="groupLabel">' + (role === 'SUPERVISOR' ? 'SUPERVISORS' : 'ALL WCHR') + '</span>');

  nameInput.addEventListener('input', () => setMessage('Name entered. Select role and press START SHIFT.', true));
  roleSelect.addEventListener('change', () => setMessage('Role selected: ' + roleSelect.options[roleSelect.selectedIndex].text, true));

  setMessage('JavaScript loaded successfully. Name field and role selector are active.', true);
  showStartScreen();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
