import Phaser from 'phaser';
import './style.css';
import { RoomOneScene } from './scenes/RoomOneScene';
import { RoomTwoScene } from './scenes/RoomTwoScene';
import { RoomThreeScene } from './scenes/RoomThreeScene';
import { toggleSound, unlockAudio } from './game/sound';
import { setVirtualKey } from './game/virtualInput';
import { getActiveApiKey } from './game/JevDecisionProvider';

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

document.querySelectorAll<HTMLButtonElement>('[data-room]').forEach(button => {
  button.addEventListener('click', () => {
    unlockAudio();
    const active = game.scene.getScenes(true)[0];
    if (active) active.scene.start(button.dataset.room!);
    button.blur();
  });
});

// Sound toggle button
const soundBtn = document.querySelector<HTMLButtonElement>('#sound-toggle');
if (soundBtn) {
  soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const enabled = toggleSound();
    soundBtn.textContent = enabled ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-label', enabled ? 'Mute Sound' : 'Unmute Sound');
  });
}

// API Key management button (useful for deployed Vercel previews)
const apiKeyBtn = document.querySelector<HTMLButtonElement>('#api-key-btn');
if (apiKeyBtn) {
  apiKeyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const current = getActiveApiKey();
    const masked = current ? `${current.slice(0, 10)}...${current.slice(-6)}` : 'None';
    const input = window.prompt(`Enter your TypeSafe AI API key:\n(Currently: ${masked})\nLeave blank to keep current key.`, '');
    if (input !== null && input.trim()) {
      localStorage.setItem('TYPESAFE_API_KEY', input.trim());
      window.alert('TypeSafe API Key saved! Refreshing page to apply.');
      window.location.reload();
    }
  });
}

// Global unlock on first user gesture
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('keydown', unlockAudio, { once: true });

// Bind virtual touch/click buttons to virtualInput state & keyboard events
function bindVirtualKey(button: HTMLElement, key: string): void {
  const triggerDown = (e: Event) => {
    e.preventDefault();
    unlockAudio();
    button.classList.add('pressed');
    setVirtualKey(key, true);
  };

  const triggerUp = (e: Event) => {
    e.preventDefault();
    button.classList.remove('pressed');
    setVirtualKey(key, false);
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
