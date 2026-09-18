import type { DecisionProvider, EnemyAction, GameState, JevDecision } from './types';

/** Temporary local brain. Swap this class for the Jev adapter without changing the scene. */
export class MockDecisionProvider implements DecisionProvider {
  async decide(state: GameState): Promise<JevDecision> {
    const started = performance.now();
    const distance = Math.hypot(state.player.x - state.enemy.x, state.player.y - state.enemy.y);
    const hurt = state.enemy.hp < 35;
    const playerIsAttacking = state.player.attacking;
    const scores: Record<EnemyAction, number> = {
      ATTACK: distance < 72 && !playerIsAttacking ? 68 : 16,
      DODGE: playerIsAttacking && distance < 110 ? 76 : 10,
      BLOCK: playerIsAttacking && distance < 80 ? 64 : 12,
      RETREAT: hurt ? 62 : distance < 42 ? 28 : 8,
    };
    const action = (Object.entries(scores) as [EnemyAction, number][])
      .sort((a, b) => b[1] - a[1])[0][0];
    await new Promise((resolve) => window.setTimeout(resolve, 70 + Math.random() * 90));
    return {
      action,
      scores,
      latencyMs: Math.round(performance.now() - started),
      reasoning: action === 'DODGE' ? 'PLAYER WIND-UP' : action === 'RETREAT' ? 'HP LOW' : 'RANGE READ',
    };
  }
}
