import { inject } from '@vercel/analytics';
import Phaser from 'phaser';
import './style.css';
import { RoomOneScene } from './scenes/RoomOneScene';
import { RoomTwoScene } from './scenes/RoomTwoScene';
import { RoomThreeScene } from './scenes/RoomThreeScene';
import { toggleSound, unlockAudio } from './game/sound';
import { setVirtualKey } from './game/virtualInput';
import { isApiKeyConfigured } from './game/JevDecisionProvider';

// Initialize Vercel Analytics
inject();

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

// API Key management modal (securely handled, key value is NEVER displayed or alerted)
const apiKeyBtn = document.querySelector<HTMLButtonElement>('#api-key-btn');
const apiKeyModal = document.querySelector<HTMLDialogElement>('#api-key-modal');
const closeModalBtn = document.querySelector<HTMLButtonElement>('#close-modal-btn');
const saveKeyBtn = document.querySelector<HTMLButtonElement>('#save-key-btn');
const clearKeyBtn = document.querySelector<HTMLButtonElement>('#clear-key-btn');
const keyStatusBadge = document.querySelector<HTMLElement>('#key-status-badge');
const keyInput = document.querySelector<HTMLInputElement>('#api-key-input');

function updateKeyStatusBadge(): void {
  if (!keyStatusBadge) return;
  const configured = isApiKeyConfigured();
  keyStatusBadge.textContent = configured ? 'CONFIGURED & ACTIVE' : 'NOT CONFIGURED';
  keyStatusBadge.className = `status-badge ${configured ? 'active' : 'missing'}`;
}

if (apiKeyBtn && apiKeyModal) {
  apiKeyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    updateKeyStatusBadge();
    if (keyInput) keyInput.value = '';
    apiKeyModal.showModal();
  });

  closeModalBtn?.addEventListener('click', () => {
    if (keyInput) keyInput.value = '';
    apiKeyModal.close();
  });

  apiKeyModal.addEventListener('click', (e) => {
    if (e.target === apiKeyModal) {
      if (keyInput) keyInput.value = '';
      apiKeyModal.close();
    }
  });

  saveKeyBtn?.addEventListener('click', () => {
    const val = keyInput?.value?.trim();
    if (val) {
      localStorage.setItem('TYPESAFE_API_KEY', val);
      if (keyInput) keyInput.value = '';
      apiKeyModal.close();
      window.location.reload();
    } else {
      apiKeyModal.close();
    }
  });

  clearKeyBtn?.addEventListener('click', () => {
    localStorage.removeItem('TYPESAFE_API_KEY');
    if (keyInput) keyInput.value = '';
    apiKeyModal.close();
    window.location.reload();
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
