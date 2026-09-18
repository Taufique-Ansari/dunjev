# Jev Dungeon — The Wayfarer

A fast-paced, three-act side-scrolling 2D fantasy brawler built with **Phaser 3**, **TypeScript**, and **Vite** designed to test and showcase **Jev (TypeSafe AI System One)** real-time decision-making in action.

In combat, enemy tactical decisions are powered by Jev's fast System One judgments. Rather than relying on hardcoded heuristics or state machines, the enemy AI evaluates live game state (distances, player attack wind-ups, enemy health) and queries Jev using the `@typesafe-ai/sdk` to output typed combat choices (`ATTACK`, `DODGE`, `BLOCK`, `RETREAT`) with calibrated probability distributions and latency metrics.

---

## Features

- **Real-Time Jev Decision Engine**: Live AI decisions for enemy actions with tactical reasoning and sub-second latency.
- **Probability & Analysis Panel**: Desktop side-by-side telemetry displaying live probability bars for all choices and a scrollable, persistent combat history stream.
- **Dual Device Experience**:
  - **Desktop / Laptop**: Side-by-side layout with the game on the left and Jev analysis panel on the right (zero vertical scrolling).
  - **Mobile**: Responsive touch gamepad with responsive D-pad, Attack, and Evade buttons.
- **Three Unique Combat Chapters**:
  1. *Act 01 · Causeway*: Duel against the Jev Spellblade.
  2. *Act 02 · Forsaken Hall*: Tactical battle against Spellblade and Ogre Guard.
  3. *Act 03 · Ember Throne*: Climactic boss encounter against the Ember Dragon.
- **CORS-Free Proxy Setup**: Pre-configured Vite proxy (`/api-typesafe`) routes requests cleanly from the browser to TypeSafe AI.

---

## Quickstart & Setup

Anyone can clone and run this game locally with their own TypeSafe AI API key:

### 1. Clone the repository

```bash
git clone <repo-url>
cd <repo-folder>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Add your TypeSafe AI API key

Create a `.env` file in the root directory:

```bash
touch .env
```

Add your API key inside `.env`:

```env
VITE_TYPESAFE_API_KEY=your_typesafe_api_key_here
```

> **Note:** You can obtain your API key from the [TypeSafe AI Dashboard](https://typesafe.ai).

### 4. Run the game

```bash
npm run dev
```

Open the local server URL printed in your terminal (default: `http://localhost:5173`). Click the game arena or press **Enter** to begin!

---

## Controls

### Keyboard (Desktop)
| Action | Key |
| --- | --- |
| **Move** | `W`, `A`, `S`, `D` or `Arrow Keys` |
| **Attack** | `Space` (Hold to chain attacks) |
| **Evade** | `Shift` |
| **Retry Act** | `R` |
| **Next Act** | `N` (After room victory) |
| **Start / Begin** | `Enter` or click on canvas |

### Touch (Mobile)
- **D-Pad**: Directional movement (`▲`, `◀`, `▶`, `▼`)
- **Action Buttons**: Crimson button for **ATTACK**, Blue button for **EVADE**

---

## Architecture & Jev Integration

The game connects to TypeSafe AI's System One API via [`src/game/JevDecisionProvider.ts`](src/game/JevDecisionProvider.ts):

- **State Payload**: Sends current coordinates, player attack status, distance to target, and current health.
- **Primitive Used**: `choice` primitive with explicit criteria defining each combat action.
- **Proxy**: Routed via `vite.config.ts` (`/api-typesafe` -> `https://api.typesafe.ai`) to keep client-side calls smooth without CORS preflight hurdles.

```typescript
const { answers } = await client.systemOne({
  state: {
    player: { x, y, hp, attacking },
    enemy: { x, y, hp, blocking },
    combat: { distance_to_player, is_player_attacking, enemy_hp_percent, room_tier }
  },
  questions: {
    action: choice(
      'You are the enemy fighter AI in a combat duel. Review `combat.distance_to_player` and the combatants in `state` to select the optimal combat action.',
      {
        ATTACK: 'Execute an offensive strike when within striking range (<140px) and the player is not guarding.',
        DODGE: 'Evade or roll to safety when `combat.is_player_attacking` is true.',
        BLOCK: 'Raise a defensive guard to absorb incoming weapon damage.',
        RETREAT: 'Disengage and back away when health is critically low.',
      }
    )
  }
});
```

---

## Art & Credits

Pixel art assets by **Luis Zuno / Ansimuz** from the *Gothicvania / Legacy Collection* (`public/assets/ansimuz`), licensed under CC0.
