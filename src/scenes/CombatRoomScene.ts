import Phaser from 'phaser';
import { JevDecisionProvider } from '../game/JevDecisionProvider';
import type { DecisionProvider, EnemyAction, GameState } from '../game/types';
import { animateArt, fighters, loadArt, playPose } from '../game/art';
import type { FighterKind } from '../game/art';
import { TelemetryHud } from '../ui/TelemetryHud';
import { unlockAudio, playSlash, playHit, playBlock, playEvade, playDragonBreath, playVictory, playDefeat } from '../game/sound';

interface RoomConfig { room: number; title: string; intro: string; enemies: { kind: string; x: number; y: number; hp: number }[]; walls: number[][]; next?: string; }
interface Actor {
  sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse;
  kind: FighterKind; hp: number; maxHp: number; facing: number;
  busyUntil: number; nextAttack: number; invulnerableUntil: number; action: EnemyAction;
}
const FONT = 'monospace';
const TITLES = ['THE EMERALD CAUSEWAY', 'THE FORSAKEN HALL', 'THE EMBER THRONE'];

export abstract class CombatRoomScene extends Phaser.Scene {
  protected abstract readonly room: RoomConfig;
  private player!: Actor;
  private enemies: Actor[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private status: 'ready' | 'playing' | 'won' | 'lost' = 'ready';
  private provider: DecisionProvider = new JevDecisionProvider();
  private hud = new TelemetryHud();
  private lastDecision = 0;
  private generation = 0;
  private pending = false;
  private hitCount = 0;
  private chrome!: Phaser.GameObjects.Graphics;
  private stats: Phaser.GameObjects.Text[] = [];
  private banner!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private environment?: Phaser.GameObjects.TileSprite;

  preload(): void { loadArt(this); }

  create(): void {
    this.generation++; this.status = 'ready'; this.pending = false; this.lastDecision = -1000; this.hitCount = 0; this.hud.reset();
    animateArt(this); this.drawEnvironment();
    this.player = this.actor('hero', 200, 392, 100, 1);
    this.enemies = this.room.enemies.map((e, i) => this.actor(e.kind === 'dragon' ? 'dragon' : e.kind === 'warden' ? 'ogre' : 'scout', 700 + i * 100, 374 + i * 32, e.hp, -1));
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,R,N,ENTER,SHIFT') as typeof this.keys;
    this.input.keyboard!.resetKeys();
    this.chrome = this.add.graphics().setDepth(1000);
    this.stats = [30, 342, 739].map(x => this.add.text(x, 468, '', { fontFamily: FONT, fontSize: '13px', color: '#f4dfaa', lineSpacing: 9 }).setDepth(1001));
    this.add.text(480, 26, TITLES[this.room.room - 1], { fontFamily: FONT, fontSize: '17px', color: '#ffe7a6', stroke: '#12131b', strokeThickness: 4 }).setOrigin(.5).setDepth(900);
    this.add.text(28, 22, `ACT 0${this.room.room}`, { fontFamily: FONT, fontSize: '12px', color: '#e7c67f', stroke: '#15151b', strokeThickness: 3 }).setDepth(900);
    this.banner = this.add.text(480, 428, '', { fontFamily: FONT, fontSize: '13px', color: '#fff0be', stroke: '#16131a', strokeThickness: 3 }).setOrigin(.5).setDepth(900);
    const veil = this.add.rectangle(480, 232, 500, 126, 0x0b0d14, .87).setStrokeStyle(1, 0x9f8251);
    const heading = this.add.text(480, 208, 'ENTER THE DUNGEON', { fontFamily: FONT, fontSize: '24px', color: '#f0d49a' }).setOrigin(.5);
    const hint = this.add.text(480, 252, 'PRESS ENTER OR CLICK TO BEGIN', { fontFamily: FONT, fontSize: '13px', color: '#b8b7b1' }).setOrigin(.5);
    this.overlay = this.add.container(0, 0, [veil, heading, hint]).setDepth(950);
    this.input.on('pointerdown', () => { if (this.status === 'ready') this.begin(); });
    const label = document.querySelector('#room-label'); if (label) label.textContent = `ACT 0${this.room.room} / 03`;
    const mode = document.querySelector('#mode'); if (mode) mode.textContent = this.room.room === 3 ? 'DRAGON' : this.room.room === 2 ? 'TACTICAL' : 'REACTIVE';
    this.renderHud();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.generation++; });
  }

  private begin(): void {
    unlockAudio();
    this.status = 'playing';
    this.overlay.setVisible(false);
    this.banner.setText('FACE YOUR FOE • SPACE TO STRIKE • SHIFT TO EVADE');
  }

  update(time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) { this.scene.restart(); return; }
    if (this.status === 'ready') { if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) this.begin(); return; }
    if (this.status !== 'playing') { if (this.status === 'won' && this.room.next && Phaser.Input.Keyboard.JustDown(this.keys.N)) this.scene.start(this.room.next); return; }
    const dt = Math.min(delta, 40) / 1000;
    if (time >= this.player.busyUntil) {
      const x = Number(this.keys.D.isDown || this.keys.RIGHT.isDown) - Number(this.keys.A.isDown || this.keys.LEFT.isDown);
      const y = Number(this.keys.S.isDown || this.keys.DOWN.isDown) - Number(this.keys.W.isDown || this.keys.UP.isDown);
      if (x) this.player.facing = x;
      this.move(this.player, x * 200 * dt, y * 85 * dt);
      playPose(this.player.sprite, 'hero', x || y ? 'walk' : 'idle');
      if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) {
        playEvade();
        this.player.invulnerableUntil = time + 320; this.player.busyUntil = time + 240;
        this.move(this.player, this.player.facing * 88, 0); this.player.sprite.setAlpha(.5);
        this.time.delayedCall(280, () => this.player.sprite.setAlpha(1));
      } else if (this.keys.SPACE.isDown && time >= this.player.nextAttack) this.swing(this.player, time);
    }
    for (const enemy of this.enemies) this.updateEnemy(enemy, time, dt);
    if (time - this.lastDecision > 650 && !this.pending) void this.decide(time);
    if (this.environment) this.environment.tilePositionX = this.player.sprite.x * .025;
    this.renderHud();
  }

  private actor(kind: FighterKind, x: number, y: number, hp: number, facing: number): Actor {
    const spec = fighters[kind];
    const shadow = this.add.ellipse(x, y - 3, kind === 'dragon' ? 180 : kind === 'ogre' ? 112 : 66, 13, 0x06090c, .5);
    const sprite = this.add.sprite(x, y, `${kind}-idle`).setOrigin(.5, 1).setScale(spec.scale);
    const actor: Actor = { sprite, shadow, kind, hp, maxHp: hp, facing, busyUntil: 0, nextAttack: this.time.now + 1200, invulnerableUntil: 0, action: 'ATTACK' };
    this.move(actor, 0, 0); playPose(sprite, kind, 'idle'); return actor;
  }

  private move(a: Actor, dx: number, dy: number): void {
    a.sprite.x = Phaser.Math.Clamp(a.sprite.x + dx, a.kind === 'dragon' ? 130 : 75, a.kind === 'dragon' ? 810 : 885);
    a.sprite.y = Phaser.Math.Clamp(a.sprite.y + dy, 350, 414);
    a.sprite.setFlipX(fighters[a.kind].left ? a.facing > 0 : a.facing < 0).setDepth(a.sprite.y);
    a.shadow.setPosition(a.sprite.x, a.sprite.y - 3).setDepth(a.sprite.y - 1);
  }

  private updateEnemy(e: Actor, time: number, dt: number): void {
    if (e.hp <= 0 || time < e.busyUntil || this.status !== 'playing') return;
    const dx = this.player.sprite.x - e.sprite.x, dy = this.player.sprite.y - e.sprite.y;
    const reach = e.kind === 'dragon' ? 195 : e.kind === 'ogre' ? 125 : 100;
    const retreatSafeDistance = reach + 120; // e.g. 220px for scout, 245px for ogre, 315px for dragon

    let step = 0;
    let lane = 0;

    if (e.action === 'RETREAT') {
      // If player is close (within retreat threshold), turn and run opposite to player
      if (Math.abs(dx) < retreatSafeDistance) {
        const runDir = dx >= 0 ? -1 : 1;
        e.facing = runDir; // Face in retreat direction (turn away from player)
        step = runDir * (e.kind === 'dragon' ? 50 : 80) * dt;
      } else {
        // Player is far enough: stand where it is, facing player
        e.facing = dx >= 0 ? 1 : -1;
        step = 0;
        lane = 0;
      }
    } else {
      e.facing = dx >= 0 ? 1 : -1;

      if (e.action === 'ATTACK') {
        // Run towards player to attack
        if (Math.abs(dx) > reach - 15) {
          step = e.facing * (e.kind === 'dragon' ? 45 : 85) * dt;
        }
        if (Math.abs(dy) > 5) {
          lane = Math.sign(dy) * 42 * dt;
        }
      } else if (e.action === 'DODGE') {
        // Evade to another lane and back off slightly if too close
        lane = (e.sprite.y > 382 ? -1 : 1) * 65 * dt;
        if (Math.abs(dx) < reach + 20) {
          step = -e.facing * 45 * dt;
        }
      } else if (e.action === 'BLOCK') {
        // Stand ground firmly
        step = 0;
        lane = 0;
      }
    }

    const prevX = e.sprite.x;
    const prevY = e.sprite.y;
    this.move(e, step, lane);

    // Only play walk animation if the enemy actually moved
    const moved = Math.abs(e.sprite.x - prevX) > 0.05 || Math.abs(e.sprite.y - prevY) > 0.05;
    playPose(e.sprite, e.kind, moved ? 'walk' : 'idle');

    e.sprite.setTint(e.action === 'BLOCK' ? 0xa5cfe0 : 0xffffff);

    if (e.action === 'ATTACK' && Math.abs(dx) < reach && Math.abs(dy) < 25 && time >= e.nextAttack) {
      this.swing(e, time);
    }
  }

  private swing(a: Actor, time: number): void {
    const isPlayer = a === this.player;
    const duration = fighters[a.kind].frames.attack / 12 * 1000;
    a.busyUntil = time + duration; a.nextAttack = time + duration + (isPlayer ? 75 : 700);
    playPose(a.sprite, a.kind, 'attack');
    if (a.kind === 'dragon') playDragonBreath();
    else playSlash();
    if (!isPlayer) { this.banner.setText(a.kind === 'dragon' ? 'DRAGON BREATH — CHANGE LANES!' : 'INCOMING STRIKE — STEP ASIDE!'); }
    this.time.delayedCall(duration * .52, () => {
      if (this.status !== 'playing' || a.hp <= 0) return;
      const reach = a.kind === 'dragon' ? 235 : a.kind === 'ogre' ? 140 : 118;
      for (const target of isPlayer ? this.enemies : [this.player]) {
        const dx = target.sprite.x - a.sprite.x;
        if (target.hp <= 0 || this.time.now < target.invulnerableUntil || Math.abs(target.sprite.y - a.sprite.y) > 28 || Math.abs(dx) > reach || dx * a.facing < -18) continue;
        const blocked = target !== this.player && target.action === 'BLOCK';
        if (blocked) playBlock();
        else playHit();
        target.hp = Math.max(0, target.hp - (blocked ? 4 : isPlayer ? 23 : a.kind === 'dragon' ? 18 : a.kind === 'ogre' ? 12 : 8));
        target.invulnerableUntil = this.time.now + 250;
        this.move(target, a.facing * (blocked ? 4 : 14), 0);
        target.sprite.setTintFill(0xffe0a0);
        this.time.delayedCall(90, () => target.sprite.clearTint());
        if (isPlayer) this.hitCount++;
        this.spark(target.sprite.x - a.facing * 12, target.sprite.y - 55);
        this.cameras.main.shake(65, .002);
        if (!target.hp) {
          target.sprite.anims.stop(); this.tweens.add({ targets: target.sprite, alpha: .25, angle: target.facing * 75, duration: 300 }); target.shadow.setAlpha(.15);
        }
      }
      if (!this.player.hp) this.finish(false);
      else if (this.enemies.every(e => !e.hp)) this.finish(true);
      this.renderHud();
    });
  }

  private spark(x: number, y: number): void {
    const g = this.add.graphics().setDepth(850).lineStyle(3, 0xffe5a3);
    for (let i = 0; i < 8; i++) { const r = i * Math.PI / 4; g.lineBetween(x + Math.cos(r) * 5, y + Math.sin(r) * 5, x + Math.cos(r) * 22, y + Math.sin(r) * 22); }
    this.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
  }

  private async decide(time: number): Promise<void> {
    const leader = this.enemies.find(e => e.hp > 0); if (!leader) return;
    this.pending = true; this.lastDecision = time; const generation = this.generation; this.hud.thinking();
    const state: GameState = { player: { x: this.player.sprite.x, y: this.player.sprite.y, hp: this.player.hp, attacking: time < this.player.busyUntil }, enemy: { x: leader.sprite.x, y: leader.sprite.y, hp: leader.hp / leader.maxHp * 100, blocking: leader.action === 'BLOCK' }, room: this.room.room, timestamp: Date.now() };
    try {
      const decision = await this.provider.decide(state);
      if (generation !== this.generation || this.status !== 'playing') return;
      leader.action = decision.action; this.hud.update(decision);
    } catch { if (generation === this.generation) this.hud.stopped('RETRYING'); }
    finally { if (generation === this.generation) this.pending = false; }
  }

  private finish(won: boolean): void {
    this.status = won ? 'won' : 'lost';
    if (won) playVictory();
    else playDefeat();
    this.hud.stopped(won ? 'ROOM CLEAR' : 'STOPPED');
    this.banner.setText(won ? this.room.next ? 'ROOM CLEARED • PRESS N TO CONTINUE' : 'DRAGON DEFEATED • THE DUNGEON IS YOURS' : 'YOU HAVE FALLEN • PRESS R TO RETRY');
    for (const a of [this.player, ...this.enemies]) if (a.hp > 0) playPose(a.sprite, a.kind, 'idle');
  }

  private renderHud(): void {
    const g = this.chrome.clear(); g.fillStyle(0x111019).fillRect(0, 445, 960, 95); g.lineStyle(3, 0x9b7740).lineBetween(0, 447, 960, 447);
    const cards = [{ x: 18, w: 300, hp: this.player.hp, max: 100, color: 0x6db791 }, { x: 330, w: 385, hp: this.enemies.reduce((n, e) => n + e.hp, 0), max: this.enemies.reduce((n, e) => n + e.maxHp, 0), color: 0xbe645b }, { x: 727, w: 215, hp: this.hitCount, max: 100, color: 0xd7af61 }];
    for (const c of cards) {
      g.fillStyle(0x25202a).fillRect(c.x, 458, c.w, 69).lineStyle(1, 0x705a3e).strokeRect(c.x, 458, c.w, 69);
      if (c.x !== 727) { g.fillStyle(0x101318).fillRect(c.x + 12, 506, c.w - 24, 9); g.fillStyle(c.color).fillRect(c.x + 12, 506, (c.w - 24) * c.hp / c.max, 9); }
    }
    const foe = this.room.room === 1 ? 'JEV • SPELLBLADE' : this.room.room === 2 ? 'JEV • OGRE GUARD' : 'JEV • EMBER DRAGON';
    this.stats[0].setText(`P1  THE WAYFARER\nHP ${this.player.hp} / 100    SWORD`);
    this.stats[1].setText(`${foe}\n${this.enemies.filter(e => e.hp > 0).length} FOES REMAIN`);
    this.stats[2].setText(`ACT 0${this.room.room} / 03\n${String(this.hitCount).padStart(3, '0')} HITS`);
    document.querySelector('#game')?.setAttribute('aria-label', `Room ${this.room.room}, ${this.status}. Player health ${this.player.hp}. Enemies: ${this.enemies.map(e => `${e.kind} ${e.hp}`).join(', ')}.`);
  }

  private drawEnvironment(): void {
    this.cameras.main.setBackgroundColor('#10151d');
    if (this.room.room === 1) {
      this.add.image(0, 0, 'sky').setOrigin(0).setScale(2.5).setDepth(-100);
      this.environment = this.add.tileSprite(0, 15, 960, 430, 'forest').setOrigin(0).setTileScale(2).setDepth(-90);
    } else if (this.room.room === 2) {
      this.add.tileSprite(0, 0, 960, 352, 'castle', 'wall').setOrigin(0).setTileScale(2).setDepth(-100);
    } else {
      this.add.image(0, 0, 'lava').setOrigin(0).setDisplaySize(960, 480).setDepth(-100);
      this.environment = this.add.tileSprite(0, 0, 960, 400, 'rocks').setOrigin(0).setTileScale(2).setDepth(-90);
    }
    this.add.tileSprite(0, 335, 960, 95, 'stone', 'paving').setOrigin(0).setTileScale(2, 1).setTint(this.room.room === 3 ? 0xbb7460 : 0x879baf).setDepth(-20);
    this.add.tileSprite(0, 430, 960, 18, 'stone', 'floor').setOrigin(0).setTileScale(2).setDepth(-20);
    this.add.rectangle(480, 338, 960, 6, 0xc3a66a).setAlpha(.6).setDepth(-19);
    this.add.rectangle(480, 443, 960, 8, 0x19151c).setDepth(850);
  }
}
