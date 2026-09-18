import { CombatRoomScene } from './CombatRoomScene';

export class RoomOneScene extends CombatRoomScene {
  protected readonly room = { room: 1, title: 'THE JEV SCOUT', intro: 'WATCH ITS FOOTWORK.', enemies: [{ kind: 'jev-scout' as const, x: 610, y: 353, hp: 90 }], walls: [], next: 'room-two' };
  constructor() { super('room-one'); }
}
