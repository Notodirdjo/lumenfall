// The DOM around the canvas: the sidebar HUD, the tower shop, the
// selected-tower panel, the buttons and the title / victory / defeat /
// pause screens. The canvas itself is drawn by render.js.

import { TOWERS, TOWER_ORDER, WAVES, TOTAL_WAVES, ECONOMY, DAWN } from './config.js';
import { waveSpawnCount, enemiesRemaining } from './waves.js';

function el(id) {
  return document.getElementById(id);
}

function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}

export class UI {
  constructor(game) {
    this.game = game;
    this.last = {}; // last values written, so untouched nodes stay untouched
    this.panelFor = null; // the tower the panel currently shows
    this.logTimer = null;
    this.buildShop();
    this.bindButtons();
  }

  setText(id, value) {
    if (this.last[id] === value) return;
    this.last[id] = value;
    const node = el(id);
    if (node) node.textContent = value;
  }

  // ---- shop ----

  buildShop() {
    const shop = el('shop');
    shop.innerHTML = '';
    for (const type of TOWER_ORDER) {
      const def = TOWERS[type];
      const card = document.createElement('button');
      card.className = 'shop-card';
      card.id = `shop-${type}`;
      card.innerHTML = `
        <span class="shop-key">${TOWER_ORDER.indexOf(type) + 1}</span>
        <span class="shop-dot" style="background:${def.color}"></span>
        <span class="shop-name">${def.name}</span>
        <span class="shop-cost">${def.cost} ✦</span>
        <span class="shop-desc">${def.desc}</span>`;
      card.addEventListener('click', () => {
        this.game.soundClick();
        this.game.selectBuild(this.game.G.buildType === type ? null : type);
      });
      shop.appendChild(card);
    }
  }

  // ---- buttons ----

  bindButtons() {
    const g = this.game;
    el('btn-start').addEventListener('click', () => g.startGame());
    el('btn-again-victory').addEventListener('click', () => g.restart());
    el('btn-again-defeat').addEventListener('click', () => g.restart());
    el('btn-resume').addEventListener('click', () => g.togglePause());
    el('btn-restart-pause').addEventListener('click', () => g.restart());
    el('btn-start-wave').addEventListener('click', () => g.startWave());
    el('btn-speed').addEventListener('click', () => g.toggleSpeed());
    el('btn-pause').addEventListener('click', () => g.togglePause());
    el('btn-dawn').addEventListener('click', () => g.fireDawn());
    el('btn-mute').addEventListener('click', () => g.toggleMute());
  }

  // ---- HUD ----

  update() {
    const G = this.game.G;
    this.setText('hud-wave', G.wave === 0 ? `— / ${TOTAL_WAVES}` : `${G.wave} / ${TOTAL_WAVES}`);
    this.setText('hud-lumens', fmt(G.lumens));
    this.setText('hud-score', fmt(G.score));
    this.setText('hud-hp-text', `${Math.max(0, G.hp)} / ${G.maxHp}`);
    const hpFrac = Math.max(0, G.hp / G.maxHp);
    const hpFill = el('hud-hp-fill');
    if (hpFill && this.last.hpFrac !== hpFrac) {
      this.last.hpFrac = hpFrac;
      hpFill.style.width = `${hpFrac * 100}%`;
      hpFill.className = `hp-fill${hpFrac <= 0.35 ? ' low' : ''}`;
    }
    const fighting = G.waveState === 'spawning' || G.waveState === 'fighting';
    this.setText('hud-left', fighting ? `${enemiesRemaining(G)} left` : '—');
    // Start-wave button.
    const startBtn = el('btn-start-wave');
    const canStart = G.state === 'playing' && G.waveState === 'idle' && G.wave < TOTAL_WAVES;
    startBtn.disabled = !canStart;
    this.setText(
      'btn-start-wave-label',
      G.wave >= TOTAL_WAVES
        ? 'All waves done'
        : G.wave === 0
          ? 'Start wave 1'
          : `Start wave ${G.wave + 1}`,
    );
    // Speed + pause labels.
    this.setText('btn-speed-label', G.speed === 1 ? 'Speed 1×' : 'Speed 2×');
    this.setText('btn-pause-label', G.state === 'paused' ? 'Resume' : 'Pause');
    // Dawn Burst.
    const dawnBtn = el('btn-dawn');
    const dawnReady = G.dawnCharges > 0 && G.dawnCooldown <= 0 && G.state === 'playing';
    dawnBtn.disabled = !dawnReady;
    this.setText(
      'dawn-label',
      G.dawnCooldown > 0
        ? `Dawn Burst (${Math.ceil(G.dawnCooldown)}s)`
        : `Dawn Burst ×${G.dawnCharges}`,
    );
    // Next-wave preview.
    if (G.wave < TOTAL_WAVES) {
      const next = G.wave + 1;
      const groups = WAVES[next - 1].groups
        .map((gr) => `${gr.count}× ${gr.type}`)
        .join(', ');
      this.setText('wave-preview', `Wave ${next}: ${groups}`);
    } else {
      this.setText('wave-preview', 'The final wave is done.');
    }
    // Shop affordability + selection.
    for (const type of TOWER_ORDER) {
      const card = el(`shop-${type}`);
      if (!card) continue;
      card.classList.toggle('afford', G.lumens >= TOWERS[type].cost);
      card.classList.toggle('selected', G.buildType === type);
    }
    this.updatePanel();
  }

  // ---- selection panel ----

  updatePanel() {
    const G = this.game.G;
    const panel = el('panel');
    const tower = G.selected;
    if (!tower) {
      if (this.panelFor !== null) {
        this.panelFor = null;
        panel.innerHTML = '<p class="panel-hint">Click a tower to upgrade it, or pick one from the shop and click the field to build.</p>';
      }
      return;
    }
    if (this.panelFor !== tower) {
      this.panelFor = tower;
      this.renderPanel(tower);
    }
    // Live bits: overcharge cooldown + affordability.
    const s = tower.stats(G.time);
    this.setText('panel-dps', `Damage ${Math.round(s.damage)} · ${s.rate.toFixed(1)}/s · Range ${Math.round(s.range)}`);
    const ocBtn = el('panel-overcharge');
    if (ocBtn) {
      const left = tower.overchargeCooldownLeft(G.time);
      const surging = tower.isOvercharged(G.time);
      ocBtn.disabled = left > 0 || surging;
      ocBtn.textContent = surging
        ? 'Surging!'
        : left > 0
          ? `Overcharge (${Math.ceil(left)}s)`
          : 'Overcharge';
    }
    const upBtn = el('panel-upgrade');
    if (upBtn) {
      const cost = tower.upgradeCost();
      upBtn.disabled = cost === null || G.lumens < cost;
    }
  }

  renderPanel(tower) {
    const G = this.game.G;
    const panel = el('panel');
    const cost = tower.upgradeCost();
    panel.innerHTML = `
      <div class="panel-head">
        <span class="shop-dot" style="background:${tower.color}"></span>
        <strong>${tower.name} · Lv ${tower.level}</strong>
      </div>
      <p class="panel-stats" id="panel-dps"></p>
      <p class="panel-stats">Shots fired: ${tower.shotsFired}</p>
      <div class="panel-actions">
        <button id="panel-upgrade" class="btn small">${cost === null ? 'Max level' : `Upgrade · ${cost} ✦`}</button>
        <button id="panel-overcharge" class="btn small">Overcharge</button>
        <button id="panel-sell" class="btn small ghost">Sell · ${tower.sellValue()} ✦</button>
      </div>`;
    el('panel-upgrade').addEventListener('click', () => this.game.upgradeSelected());
    el('panel-overcharge').addEventListener('click', () => this.game.overchargeSelected());
    el('panel-sell').addEventListener('click', () => this.game.sellSelected());
    this.last['panel-dps'] = undefined; // force a refresh on the next tick
  }

  // ---- screens ----

  showScreen(name) {
    for (const id of ['screen-title', 'screen-victory', 'screen-defeat', 'screen-pause']) {
      el(id).classList.toggle('hidden', id !== `screen-${name}`);
    }
  }

  hideScreens() {
    this.showScreen('none');
  }

  fillEndScreens() {
    const G = this.game.G;
    const stats = `Score ${fmt(G.score)} · Waves ${G.wave}/${TOTAL_WAVES} · Kills ${G.kills} · Leaks ${G.leaked} · Lumens earned ${fmt(G.earned)}`;
    el('victory-stats').textContent = stats;
    el('defeat-stats').textContent = stats;
    el('best-score').textContent = G.best > 0 ? `Best score: ${fmt(G.best)}` : '';
  }

  setMuted(muted) {
    el('btn-mute').textContent = muted ? '🔇 Sound off' : '🔊 Sound on';
  }

  log(text, ms = 2600) {
    const node = el('log');
    node.textContent = text;
    node.classList.add('show');
    if (this.logTimer) clearTimeout(this.logTimer);
    this.logTimer = setTimeout(() => node.classList.remove('show'), ms);
  }
}
