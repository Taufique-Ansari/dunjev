export type EnemyAction = 'ATTACK' | 'DODGE' | 'BLOCK' | 'RETREAT';

export interface GameState {
  player: { x: number; y: number; hp: number; attacking: boolean };
  enemy: { x: number; y: number; hp: number; blocking: boolean };
  room: number;
  timestamp: number;
}

export interface JevDecision {
  action: EnemyAction;
  scores: Record<EnemyAction, number>;
  latencyMs: number;
  reasoning: string;
}

export interface DecisionProvider {
  decide(state: GameState): Promise<JevDecision>;
}
