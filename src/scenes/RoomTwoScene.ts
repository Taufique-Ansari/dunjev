import { CombatRoomScene } from './CombatRoomScene';

export class RoomTwoScene extends CombatRoomScene {
  protected readonly room = { room: 2, title: 'THE WARDEN PAIR', intro: 'TWO MINDS. ONE INTENT.', enemies: [{ kind: 'jev-scout' as const, x: 555, y: 290, hp: 82 }, { kind: 'warden' as const, x: 655, y: 354, hp: 125 }], walls: [], next: 'room-three' };
  constructor() { super('room-two'); }
}
