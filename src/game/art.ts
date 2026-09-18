import Phaser from 'phaser';

export type FighterKind = 'hero' | 'scout' | 'ogre' | 'dragon';
export type Pose = 'idle' | 'walk' | 'attack' | 'hurt';
// Native frame sizes from Ansimuz's sheets. No image stretching or fixed five-frame template.
export const fighters = {
  hero: { width: 128, height: 96, scale: 3, left: false, frames: { idle: 4, walk: 12, attack: 6, hurt: 3 } },
  scout: { width: 128, height: 64, scale: 3, left: false, frames: { idle: 4, walk: 7, attack: 5, hurt: 0 } },
  ogre: { width: 144, height: 80, scale: 2.6, left: true, frames: { idle: 4, walk: 6, attack: 7, hurt: 0 } },
  dragon: { width: 144, height: 64, scale: 4, left: true, frames: { idle: 6, walk: 0, attack: 7, hurt: 0 } },
} as const;

export function loadArt(scene: Phaser.Scene): void {
  for (const [kind, spec] of Object.entries(fighters)) {
    for (const [pose, count] of Object.entries(spec.frames)) {
      const key = `${kind}-${pose}`;
      if (count && !scene.textures.exists(key)) scene.load.spritesheet(key, `assets/ansimuz/${key}.png`, { frameWidth: spec.width, frameHeight: spec.height });
    }
  }
  for (const key of ['sky', 'forest', 'castle', 'stone', 'lava', 'rocks']) {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/ansimuz/${key}.png`);
  }
}

export function animateArt(scene: Phaser.Scene): void {
  for (const [kind, spec] of Object.entries(fighters)) {
    for (const [pose, count] of Object.entries(spec.frames)) {
      const key = `${kind}-${pose}`;
      if (count && !scene.anims.exists(key)) scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key, { start: 0, end: count - 1 }), frameRate: pose === 'idle' ? 6 : pose === 'attack' ? 12 : 13, repeat: pose === 'idle' || pose === 'walk' ? -1 : 0 });
    }
  }
  if (!scene.textures.get('stone').has('floor')) scene.textures.get('stone').add('floor', 0, 32, 32, 32, 32);
  if (!scene.textures.get('stone').has('paving')) scene.textures.get('stone').add('paving', 0, 192, 96, 32, 32);
  if (!scene.textures.get('castle').has('wall')) scene.textures.get('castle').add('wall', 0, 0, 0, 480, 176);
}

export function playPose(sprite: Phaser.GameObjects.Sprite, kind: FighterKind, pose: Pose): void {
  const available = fighters[kind].frames[pose] ? pose : 'idle';
  sprite.play(`${kind}-${available}`, true);
}
