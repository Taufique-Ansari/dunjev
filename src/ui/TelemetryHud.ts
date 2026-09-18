import type { JevDecision } from '../game/types';

const ACTIONS = ['ATTACK', 'DODGE', 'BLOCK', 'RETREAT'] as const;

export class TelemetryHud {
  private decisionCount = 0;

  reset(): void {
    const list = document.querySelector<HTMLDivElement>('#decision-list');
    if (list) {
      list.innerHTML = ACTIONS.map(action => `
        <div class="action">
          <span class="action-name">${action}</span>
          <span class="action-score">--%</span>
        </div>
      `).join('');
    }
    this.text('#selected-action', 'WAITING FOR COMBAT');
    this.text('#latency', '-- ms');
    this.stopped('STANDBY');
  }

  stopped(label = 'COMPLETE'): void {
    this.text('#thinking', label);
  }

  update(decision: JevDecision): void {
    this.decisionCount++;

    // Update live probability meters
    const list = document.querySelector<HTMLDivElement>('#decision-list');
    if (list) {
      list.innerHTML = Object.entries(decision.scores)
        .sort(([, a], [, b]) => b - a)
        .map(([action, score]) => `
          <div class="action ${action === decision.action ? 'active' : ''}">
            <div class="action-fill" style="width: ${score}%"></div>
            <span class="action-name">${action}</span>
            <span class="action-score">${score}%</span>
          </div>
        `)
        .join('');
    }

    this.text('#selected-action', `› ${decision.action}  //  ${decision.reasoning}`);
    this.text('#latency', `${decision.latencyMs} ms`);
    this.text('#thinking', 'COMPLETE');

    // Append to decision history stream
    this.appendLog(decision);
  }

  thinking(): void {
    this.text('#thinking', 'THINKING...');
  }

  private appendLog(decision: JevDecision): void {
    const log = document.querySelector<HTMLDivElement>('#decision-log');
    const countEl = document.querySelector<HTMLElement>('#log-count');
    if (countEl) {
      countEl.textContent = String(this.decisionCount);
    }

    if (!log) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <div class="log-top">
        <span class="log-index">#${this.decisionCount.toString().padStart(2, '0')}</span>
        <span class="log-badge ${decision.action.toLowerCase()}">${decision.action}</span>
        <span class="log-latency">${decision.latencyMs}ms</span>
        <span class="log-time">${timeStr}</span>
      </div>
      <div class="log-probabilities">
        ${Object.entries(decision.scores)
          .sort(([, a], [, b]) => b - a)
          .map(([act, sc]) => `
            <div class="log-bar-wrap ${act === decision.action ? 'is-winner' : ''}">
              <div class="log-bar-header">
                <span>${act}</span>
                <span>${sc}%</span>
              </div>
              <div class="log-bar-track">
                <div class="log-bar-fill" style="width: ${sc}%"></div>
              </div>
            </div>
          `).join('')}
      </div>
      <div class="log-reasoning">
        <span class="reasoning-label">REASON:</span> ${decision.reasoning}
      </div>
    `;

    log.appendChild(entry);
    // Auto-scroll to show the newest decision
    log.scrollTop = log.scrollHeight;
  }

  private text(selector: string, value: string): void {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  }
}
