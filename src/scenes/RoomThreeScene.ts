import { CombatRoomScene } from './CombatRoomScene';

export class RoomThreeScene extends CombatRoomScene {
  protected readonly room = { room: 3, title: 'JEV DRAGON', intro: 'THE FINAL DECISION AWAITS.', enemies: [{ kind: 'dragon' as const, x: 625, y: 354, hp: 230 }], walls: [], next: undefined };
  constructor() { super('room-three'); }
}
