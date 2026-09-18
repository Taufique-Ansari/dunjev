import Phaser from 'phaser';
import './style.css';
import { RoomOneScene } from './scenes/RoomOneScene';
import { RoomTwoScene } from './scenes/RoomTwoScene';
import { RoomThreeScene } from './scenes/RoomThreeScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#0d1b12',
  pixelArt: true,
  roundPixels: true,
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [RoomOneScene, RoomTwoScene, RoomThreeScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});

import { toggleSound, unlockAudio } from './game/sound';

document.querySelectorAll<HTMLButtonElement>('[data-room]').forEach(button => {
  button.addEventListener('click', () => {
    unlockAudio();
    const active = game.scene.getScenes(true)[0];
    if (active) active.scene.start(button.dataset.room!);
    button.blur();
  });
});

const soundBtn = document.querySelector<HTMLButtonElement>('#sound-toggle');
if (soundBtn) {
  soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const enabled = toggleSound();
    soundBtn.textContent = enabled ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-label', enabled ? 'Mute Sound' : 'Unmute Sound');
  });
}

// Global unlock on first user gesture
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

// Bind Gameboy virtual touch/click buttons to keyboard events
function bindVirtualKey(button: HTMLElement, key: string): void {
  const code = key === ' ' ? 'Space' : key.startsWith('Arrow') ? key : key.length === 1 ? `Key${key.toUpperCase()}` : key;

  const triggerDown = (e: Event) => {
    e.preventDefault();
    button.classList.add('pressed');
    window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true }));
  };

  const triggerUp = (e: Event) => {
    e.preventDefault();
    button.classList.remove('pressed');
    window.dispatchEvent(new KeyboardEvent('keyup', { key, code, bubbles: true }));
  };

  button.addEventListener('touchstart', triggerDown, { passive: false });
  button.addEventListener('touchend', triggerUp, { passive: false });
  button.addEventListener('touchcancel', triggerUp, { passive: false });
  button.addEventListener('mousedown', triggerDown);
  button.addEventListener('mouseup', triggerUp);
  button.addEventListener('mouseleave', triggerUp);
}

document.querySelectorAll<HTMLElement>('[data-key]').forEach(btn => {
  const key = btn.dataset.key;
  if (key) bindVirtualKey(btn, key);
});
