import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import type { DecisionProvider, EnemyAction, GameState, JevDecision } from './types';

const ACTIONS = ['ATTACK', 'DODGE', 'BLOCK', 'RETREAT'] as const;

export function getActiveApiKey(): string {
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('TYPESAFE_API_KEY');
    if (customKey && customKey.trim()) return customKey.trim();
  }

  const envKey = import.meta.env.VITE_TYPESAFE_API_KEY as string | undefined;
  if (envKey && envKey.trim()) return envKey.trim();

  return '';
}

export function isApiKeyConfigured(): boolean {
  return Boolean(getActiveApiKey());
}

/**
 * Calls TypeSafe System One (Jev) via proxy (/api-typesafe) to decide the next enemy action.
 * Adheres to TypeSafe skill guidelines: structured state, clear criteria, and backticked path references.
 * Specialized for boss encounters: Dragons behave with high aggression and rarely retreat.
 */
export class JevDecisionProvider implements DecisionProvider {
  private getClient(): TypeSafeClient {
    const apiKey = getActiveApiKey();
    if (!apiKey) {
      throw new Error('TypeSafe API Key is not configured. Click "🔑 KEY" in the header to enter your key.');
    }
    const baseURL = typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/api-typesafe`
      : '/api-typesafe';

    return new TypeSafeClient({
      apiKey,
      dangerouslyAllowBrowser: true,
      baseURL,
    });
  }

  async decide(state: GameState): Promise<JevDecision> {
    const started = performance.now();
    const distance = Math.round(Math.abs(state.enemy.x - state.player.x));
    const isDragon = state.room === 3;
    const client = this.getClient();

    try {
      const { answers } = await client.systemOne({
        state: {
          player: {
            x: Math.round(state.player.x),
            y: Math.round(state.player.y),
            hp: state.player.hp,
            attacking: state.player.attacking,
          },
          enemy: {
            x: Math.round(state.enemy.x),
            y: Math.round(state.enemy.y),
            hp: Math.round(state.enemy.hp),
            blocking: state.enemy.blocking,
            archetype: isDragon ? 'Apex Ember Dragon (Relentless Apex Predator)' : 'Dungeon Guardian Fighter',
          },
          combat: {
            distance_to_player: distance,
            is_player_attacking: state.player.attacking,
            enemy_hp_percent: Math.round(state.enemy.hp),
            room_tier: state.room,
            is_boss_encounter: isDragon,
          },
        },
        questions: {
          action: choice(
            isDragon
              ? 'You are the Ember Dragon boss in `state.enemy.archetype`. Dragons are fierce, aggressive apex predators with devastating breath. You do NOT retreat easily; your instinct is to overpower the player with relentless attacks, only dodging or blocking in dire situations.'
              : 'You are the enemy fighter AI in a combat duel. Review `combat.distance_to_player` and the combatants in `state` to select the optimal combat action.',
            {
              ATTACK: isDragon
                ? 'Unleash dragon breath and claw strikes to crush the player. Primary choice whenever the player is within arena range.'
                : 'Execute an offensive strike when within striking range (<140px) and the player is not guarding or retreating.',
              DODGE: isDragon
                ? 'Briefly reposition if the player attempts a sudden counter.'
                : 'Evade or roll to safety when `combat.is_player_attacking` is true and danger is imminent.',
              BLOCK: isDragon
                ? 'Tough scaly hide deflects attack if caught off-guard.'
                : 'Raise a defensive guard to absorb incoming weapon damage at close quarters.',
              RETREAT: isDragon
                ? 'Never retreat unless near death (<15% HP) and severely overwhelmed. Otherwise, dragons always fight forward.'
                : 'Disengage and back away when health is critically low or to reposition.',
            },
          ),
        },
      });

      const latencyMs = Math.round(performance.now() - started);
      const answer = answers.action;

      // Convert probabilities (0–1) to percentage scores (0–100)
      const scores = {} as Record<EnemyAction, number>;
      for (const a of ACTIONS) {
        scores[a] = Math.round((answer.probabilities[a] ?? 0) * 100);
      }

      const action = answer.choice as EnemyAction;
      const confidence = Math.round(answer.confidence * 100);

      const reasonMap: Record<EnemyAction, string> = {
        ATTACK: isDragon ? 'DRAGON RAGE / BREATH' : `IN RANGE (${distance}px)`,
        DODGE: isDragon ? 'WING REPOSITION' : 'EVADING ATTACK',
        BLOCK: isDragon ? 'SCALE ARMOR GUARD' : 'DEFENSIVE GUARD',
        RETREAT: isDragon ? 'CRITICAL HP FALLBACK' : 'LOW HP DISENGAGE',
      };

      return {
        action,
        scores,
        latencyMs,
        reasoning: `${reasonMap[action] ?? action} · ${confidence}% conf`,
      };
    } catch (error) {
      const latencyMs = Math.round(performance.now() - started);
      console.error('[JevDecisionProvider] Error calling TypeSafe Jev API:', error);

      // Re-throw with descriptive message so caller / HUD can inform user
      throw new Error(`Jev API Error (${latencyMs}ms): ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
