// Keyboard and mouse state, sampled once per frame by the game loop.
// No game logic lives here; systems read the plain fields below.
export class Input {
  constructor(target) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.enabled = true;
    this.target = target || window;
    this.onKeyDown = (event) => this.handleDown(event);
    this.onKeyUp = (event) => this.handleUp(event);
    this.onMouseMove = (event) => this.handleMove(event);
    this.onMouseDown = () => { this.mouseDown = true; };
    this.onMouseUp = () => { this.mouseDown = false; };
    this.onBlur = () => { this.keys.clear(); this.mouseDown = false; };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('blur', this.onBlur);
  }
  handleDown(event) {
    const code = event.code;
    if (!this.keys.has(code)) this.pressed.add(code);
    this.keys.add(code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) event.preventDefault();
  }
  handleUp(event) {
    this.keys.delete(event.code);
  }
  handleMove(event) {
    if (!this.enabled) return;
    this.mouseDX += event.movementX || 0;
    this.mouseDY += event.movementY || 0;
  }
  down(code) {
    return this.keys.has(code);
  }
  justPressed(code) {
    return this.pressed.has(code);
  }
  axis(negative, positive) {
    let value = 0;
    if (this.down(negative)) value -= 1;
    if (this.down(positive)) value += 1;
    return value;
  }
  forwardAxis() {
    return this.axis('KeyS', 'KeyW') + this.axis('ArrowDown', 'ArrowUp');
  }
  strafeAxis() {
    return this.axis('KeyA', 'KeyD') + this.axis('ArrowLeft', 'ArrowRight');
  }
  consumeMouse() {
    const out = { dx: this.mouseDX, dy: this.mouseDY };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return out;
  }
  endFrame() {
    this.pressed.clear();
  }
  gamepadAxes() {
    // Optional gamepad support: left stick mirrors WASD, so a pad player
    // gets the same driving and walking without extra bindings.
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const pad of pads) {
        if (!pad || !pad.connected) continue;
        const x = Math.abs(pad.axes[0] || 0) > 0.18 ? pad.axes[0] : 0;
        const y = Math.abs(pad.axes[1] || 0) > 0.18 ? pad.axes[1] : 0;
        return { x, y, buttons: pad.buttons.map((b) => b.pressed) };
      }
    } catch (err) {
      return { x: 0, y: 0, buttons: [] };
    }
    return { x: 0, y: 0, buttons: [] };
  }
  anyMovementKey() {
    return this.down('KeyW') || this.down('KeyA') || this.down('KeyS') || this.down('KeyD')
      || this.down('ArrowUp') || this.down('ArrowDown') || this.down('ArrowLeft') || this.down('ArrowRight');
  }
  snapshot() {
    return {
      forward: this.forwardAxis(),
      strafe: this.strafeAxis(),
      run: this.down('ShiftLeft') || this.down('ShiftRight'),
      handbrake: this.down('Space'),
      interact: this.down('KeyE'),
      job: this.down('KeyF'),
    };
  }
  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
export const KEY_HELP = [
  ['W A S D', 'Move / drive'],
  ['Shift', 'Run / boost'],
  ['Space', 'Handbrake / jump step'],
  ['E', 'Enter or leave a car / talk'],
  ['F', 'Interact / start job'],
  ['H', 'Honk / hail'],
  ['M', 'Toggle music'],
  ['P or Esc', 'Pause'],
  ['Mouse', 'Orbit camera'],
];
