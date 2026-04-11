// ============================================================
// INTERAKTIVES COCKPIT — Klickbare Instrumente & Schalter
// ============================================================

export class Cockpit {
  constructor(container, onAction) {
    this.container = container;
    this.onAction = onAction; // callback(type, value)
    this.state = {
      masterBattery: true,
      apuRunning: false,
      engineStart1: false,
      engineStart2: false,
      seatbeltSign: true,
      noSmoking: true,
      landingLights: false,
      navLights: true,
      strobes: true,
      beacon: false,
      pitotHeat: false,
      antiIce: false,
      autopilot: false,
      apAltHold: false,
      apHdgHold: false,
      apVnav: false,
      apSpeed: 250,
      apAlt: 10000,
      apHdg: 0,
      apVs: 0,
      autobrake: 0, // 0=off, 1=low, 2=med, 3=high, 4=max
      parkingBrake: true,
      flaps: 0,
      gear: true,
      spoilers: false,
      throttle1: 0,
      throttle2: 0,
    };
    this.build();
  }

  build() {
    this.container.innerHTML = '';
    this.container.className = 'cockpit-panel';

    // === OVERHEAD PANEL ===
    const overhead = this.section('OVERHEAD PANEL');

    this.addRow(overhead, [
      this.toggleSwitch('masterBattery', 'BATT', 'Master Battery'),
      this.toggleSwitch('apuRunning', 'APU', 'Auxiliary Power Unit'),
      this.toggleSwitch('engineStart1', 'ENG 1', 'Engine 1 Start'),
      this.toggleSwitch('engineStart2', 'ENG 2', 'Engine 2 Start'),
    ]);

    this.addRow(overhead, [
      this.toggleSwitch('seatbeltSign', 'SEATBELT', 'Anschnallzeichen'),
      this.toggleSwitch('noSmoking', 'NO SMOK', 'Rauchverbot'),
      this.toggleSwitch('pitotHeat', 'PITOT', 'Pitot Heat'),
      this.toggleSwitch('antiIce', 'ANTI-ICE', 'Anti-Ice'),
    ]);

    // === LIGHTS PANEL ===
    const lights = this.section('EXTERNAL LIGHTS');

    this.addRow(lights, [
      this.toggleSwitch('landingLights', 'LAND', 'Landing Lights'),
      this.toggleSwitch('navLights', 'NAV', 'Navigation Lights'),
      this.toggleSwitch('strobes', 'STROBE', 'Strobe Lights'),
      this.toggleSwitch('beacon', 'BCN', 'Beacon'),
    ]);

    // === AUTOPILOT (MCP) ===
    const ap = this.section('AUTOPILOT / MCP');

    this.addRow(ap, [
      this.dial('apSpeed', 'SPD', 100, 400, 'kt', 5),
      this.dial('apHdg', 'HDG', 0, 359, '°', 5),
      this.dial('apAlt', 'ALT', 0, 45000, 'ft', 500),
      this.dial('apVs', 'V/S', -3000, 3000, 'fpm', 100),
    ]);

    this.addRow(ap, [
      this.pushButton('autopilot', 'A/P', 'Autopilot Master'),
      this.pushButton('apHdgHold', 'HDG', 'Heading Hold'),
      this.pushButton('apAltHold', 'ALT', 'Altitude Hold'),
      this.pushButton('apVnav', 'VNAV', 'Vertical Navigation'),
    ]);

    // === THROTTLE QUADRANT ===
    const tq = this.section('THROTTLE QUADRANT');

    this.addRow(tq, [
      this.slider('throttle1', 'THR 1', 0, 100),
      this.slider('throttle2', 'THR 2', 0, 100),
      this.flapSelector(),
      this.gearLever(),
    ]);

    // === GROUND CONTROL ===
    const gc = this.section('GROUND CONTROL');

    this.addRow(gc, [
      this.pushButton('parkingBrake', 'P/BRK', 'Parking Brake'),
      this.pushButton('spoilers', 'SPLR', 'Spoilers'),
      this.autobrakeSelector(),
    ]);
  }

  section(title) {
    const sec = document.createElement('div');
    sec.className = 'cpt-section';
    const h = document.createElement('div');
    h.className = 'cpt-section-title';
    h.textContent = title;
    sec.appendChild(h);
    this.container.appendChild(sec);
    return sec;
  }

  addRow(parent, elements) {
    const row = document.createElement('div');
    row.className = 'cpt-row';
    elements.forEach(el => row.appendChild(el));
    parent.appendChild(row);
  }

  // --- TOGGLE SWITCH ---
  toggleSwitch(key, label, tooltip) {
    const wrap = document.createElement('div');
    wrap.className = 'cpt-switch-wrap';
    wrap.title = tooltip;

    const sw = document.createElement('div');
    sw.className = `cpt-switch ${this.state[key] ? 'on' : ''}`;
    sw.innerHTML = `<div class="cpt-switch-handle"></div>`;

    const lbl = document.createElement('div');
    lbl.className = 'cpt-label';
    lbl.textContent = label;

    sw.addEventListener('click', () => {
      this.state[key] = !this.state[key];
      sw.classList.toggle('on', this.state[key]);
      this.onAction('switch', { key, value: this.state[key] });
      this.handleSystemLogic(key);
    });

    wrap.appendChild(sw);
    wrap.appendChild(lbl);
    return wrap;
  }

  // --- PUSH BUTTON ---
  pushButton(key, label, tooltip) {
    const wrap = document.createElement('div');
    wrap.className = 'cpt-btn-wrap';
    wrap.title = tooltip;

    const btn = document.createElement('button');
    btn.className = `cpt-btn ${this.state[key] ? 'active' : ''}`;
    btn.textContent = label;

    btn.addEventListener('click', () => {
      this.state[key] = !this.state[key];
      btn.classList.toggle('active', this.state[key]);
      this.onAction('button', { key, value: this.state[key] });
      this.handleSystemLogic(key);
    });

    wrap.appendChild(btn);
    return wrap;
  }

  // --- ROTARY DIAL ---
  dial(key, label, min, max, unit, step) {
    const wrap = document.createElement('div');
    wrap.className = 'cpt-dial-wrap';

    const display = document.createElement('div');
    display.className = 'cpt-dial-display';
    display.textContent = this.state[key];

    const unitEl = document.createElement('span');
    unitEl.className = 'cpt-dial-unit';
    unitEl.textContent = unit;
    display.appendChild(unitEl);

    const lbl = document.createElement('div');
    lbl.className = 'cpt-label';
    lbl.textContent = label;

    const controls = document.createElement('div');
    controls.className = 'cpt-dial-controls';

    const btnDec = document.createElement('button');
    btnDec.className = 'cpt-dial-btn';
    btnDec.textContent = '−';
    btnDec.addEventListener('click', () => {
      this.state[key] = Math.max(min, this.state[key] - step);
      display.textContent = this.state[key];
      display.appendChild(unitEl);
      this.onAction('dial', { key, value: this.state[key] });
    });

    const btnInc = document.createElement('button');
    btnInc.className = 'cpt-dial-btn';
    btnInc.textContent = '+';
    btnInc.addEventListener('click', () => {
      this.state[key] = Math.min(max, this.state[key] + step);
      display.textContent = this.state[key];
      display.appendChild(unitEl);
      this.onAction('dial', { key, value: this.state[key] });
    });

    controls.appendChild(btnDec);
    controls.appendChild(btnInc);

    wrap.appendChild(lbl);
    wrap.appendChild(display);
    wrap.appendChild(controls);
    return wrap;
  }

  // --- THROTTLE SLIDER ---
  slider(key, label, min, max) {
    const wrap = document.createElement('div');
    wrap.className = 'cpt-slider-wrap';

    const lbl = document.createElement('div');
    lbl.className = 'cpt-label';
    lbl.textContent = label;

    const track = document.createElement('div');
    track.className = 'cpt-slider-track';

    const fill = document.createElement('div');
    fill.className = 'cpt-slider-fill';
    fill.style.height = `${this.state[key]}%`;

    const val = document.createElement('div');
    val.className = 'cpt-slider-val';
    val.textContent = `${this.state[key]}%`;

    track.appendChild(fill);

    let dragging = false;
    const updateSlider = (e) => {
      const rect = track.getBoundingClientRect();
      const pct = Math.round(Math.max(0, Math.min(100, (1 - (e.clientY - rect.top) / rect.height) * 100)));
      this.state[key] = pct;
      fill.style.height = `${pct}%`;
      val.textContent = `${pct}%`;
      this.onAction('throttle', { key, value: pct / 100 });
    };

    track.addEventListener('pointerdown', (e) => {
      dragging = true;
      track.setPointerCapture(e.pointerId);
      updateSlider(e);
    });
    track.addEventListener('pointermove', (e) => { if (dragging) updateSlider(e); });
    track.addEventListener('pointerup', () => { dragging = false; });

    wrap.appendChild(lbl);
    wrap.appendChild(track);
    wrap.appendChild(val);
    return wrap;
  }

  // --- FLAP SELECTOR ---
  flapSelector() {
    const wrap = document.createElement('div');
    wrap.className = 'cpt-flap-wrap';

    const lbl = document.createElement('div');
    lbl.className = 'cpt-label';
    lbl.textContent = 'FLAPS';

    const positions = ['UP', '1', '2', '3', 'FULL'];
    const btns = document.createElement('div');
    btns.className = 'cpt-flap-positions';

    positions.forEach((pos, i) => {
      const btn = document.createElement('button');
      btn.className = `cpt-flap-btn ${i === this.state.flaps ? 'active' : ''}`;
      btn.textContent = pos;
      btn.addEventListener('click', () => {
        this.state.flaps = i;
        btns.querySelectorAll('.cpt-flap-btn').forEach((b, j) => b.classList.toggle('active', j === i));
        this.onAction('flaps', { value: i });
      });
      btns.appendChild(btn);
    });

    wrap.appendChild(lbl);
    wrap.appendChild(btns);
    return wrap;
  }

  // --- GEAR LEVER ---
  gearLever() {
    const wrap = document.createElement('div');
    wrap.className = 'cpt-gear-wrap';

    const lbl = document.createElement('div');
    lbl.className = 'cpt-label';
    lbl.textContent = 'GEAR';

    const lever = document.createElement('div');
    lever.className = `cpt-gear-lever ${this.state.gear ? 'down' : 'up'}`;

    const handle = document.createElement('div');
    handle.className = 'cpt-gear-handle';
    handle.textContent = this.state.gear ? 'DN' : 'UP';

    lever.appendChild(handle);

    lever.addEventListener('click', () => {
      this.state.gear = !this.state.gear;
      lever.classList.toggle('down', this.state.gear);
      lever.classList.toggle('up', !this.state.gear);
      handle.textContent = this.state.gear ? 'DN' : 'UP';
      this.onAction('gear', { value: this.state.gear });
    });

    wrap.appendChild(lbl);
    wrap.appendChild(lever);
    return wrap;
  }

  // --- AUTOBRAKE SELECTOR ---
  autobrakeSelector() {
    const wrap = document.createElement('div');
    wrap.className = 'cpt-autobrake-wrap';

    const lbl = document.createElement('div');
    lbl.className = 'cpt-label';
    lbl.textContent = 'AUTOBRAKE';

    const positions = ['OFF', 'LO', 'MED', 'HI', 'MAX'];
    const btns = document.createElement('div');
    btns.className = 'cpt-flap-positions';

    positions.forEach((pos, i) => {
      const btn = document.createElement('button');
      btn.className = `cpt-flap-btn ${i === this.state.autobrake ? 'active' : ''}`;
      btn.textContent = pos;
      btn.addEventListener('click', () => {
        this.state.autobrake = i;
        btns.querySelectorAll('.cpt-flap-btn').forEach((b, j) => b.classList.toggle('active', j === i));
        this.onAction('autobrake', { value: i });
      });
      btns.appendChild(btn);
    });

    wrap.appendChild(lbl);
    wrap.appendChild(btns);
    return wrap;
  }

  // --- SYSTEM LOGIC ---
  handleSystemLogic(key) {
    if (key === 'landingLights' || key === 'navLights' || key === 'strobes' || key === 'beacon') {
      this.onAction('lights', {
        landing: this.state.landingLights,
        nav: this.state.navLights,
        strobes: this.state.strobes,
        beacon: this.state.beacon,
      });
    }
  }

  // --- UPDATE FROM SERVER STATE ---
  updateFromState(s) {
    if (!s) return;
    this.state.flaps = s.flaps;
    this.state.gear = s.gear;
    this.state.spoilers = s.spoilers;

    // Update throttle sliders visually
    this.state.throttle1 = Math.round(s.throttle * 100);
    this.state.throttle2 = Math.round(s.throttle * 100);

    // Update visual elements
    const fills = this.container.querySelectorAll('.cpt-slider-fill');
    const vals = this.container.querySelectorAll('.cpt-slider-val');
    if (fills[0]) fills[0].style.height = `${this.state.throttle1}%`;
    if (fills[1]) fills[1].style.height = `${this.state.throttle2}%`;
    if (vals[0]) vals[0].textContent = `${this.state.throttle1}%`;
    if (vals[1]) vals[1].textContent = `${this.state.throttle2}%`;
  }
}
