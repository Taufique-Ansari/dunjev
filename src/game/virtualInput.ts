/** Direct virtual input state for mobile touch controls and gamepads */
export interface VirtualInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
  evade: boolean;
  justEvaded: boolean;
  retry: boolean;
  start: boolean;
  next: boolean;
}

export const virtualInput: VirtualInputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  attack: false,
  evade: false,
  justEvaded: false,
  retry: false,
  start: false,
  next: false,
};

const KEY_CODES: Record<string, number> = {
  'ArrowUp': 38,
  'ArrowDown': 40,
  'ArrowLeft': 37,
  'ArrowRight': 39,
  'w': 87,
  'a': 65,
  's': 83,
  'd': 68,
  ' ': 32,
  'Shift': 16,
  'r': 82,
  'Enter': 13,
  'n': 78,
};

/** Dispatch a synthetic KeyboardEvent with explicit keyCode and which for Phaser */
export function dispatchKeyEvent(type: 'keydown' | 'keyup', key: string): void {
  const keyCode = KEY_CODES[key] ?? key.charCodeAt(0);
  const code = key === ' ' ? 'Space' : key.startsWith('Arrow') ? key : `Key${key.toUpperCase()}`;

  const event = new KeyboardEvent(type, {
    key,
    code,
    bubbles: true,
    cancelable: true,
  });

  // Phaser 3 KeyboardPlugin accesses event.keyCode directly
  Object.defineProperty(event, 'keyCode', { get: () => keyCode });
  Object.defineProperty(event, 'which', { get: () => keyCode });

  window.dispatchEvent(event);
}

/** Update virtual input flags directly and dispatch keyboard events */
export function setVirtualKey(key: string, isDown: boolean): void {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      virtualInput.up = isDown;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      virtualInput.down = isDown;
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      virtualInput.left = isDown;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      virtualInput.right = isDown;
      break;
    case ' ':
      virtualInput.attack = isDown;
      break;
    case 'Shift':
      if (isDown && !virtualInput.evade) {
        virtualInput.justEvaded = true;
      }
      virtualInput.evade = isDown;
      break;
    case 'r':
    case 'R':
      if (isDown) virtualInput.retry = true;
      break;
    case 'Enter':
      if (isDown) virtualInput.start = true;
      break;
    case 'n':
    case 'N':
      if (isDown) virtualInput.next = true;
      break;
  }

  // Also dispatch keyboard event with explicit keyCode for Phaser listeners
  dispatchKeyEvent(isDown ? 'keydown' : 'keyup', key);
}
