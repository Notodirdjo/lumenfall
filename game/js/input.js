// Mouse and keyboard: placing towers, selecting them, and every shortcut.
// Coordinates are translated from the page into field cells, so the canvas
// can be shown at any size.

import { CELL, COLS, ROWS, TOWER_ORDER } from './config.js';

export function bindInput(game) {
  // NOTE: never capture game.G here. beginRun() replaces the state object
  // on every restart, so each handler reads game.G fresh.
  const canvas = game.G.canvas;

  function cellFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    const col = Math.floor(x / CELL);
    const row = Math.floor(y / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { col, row };
  }

  canvas.addEventListener('mousemove', (ev) => {
    game.G.hover = cellFromEvent(ev);
  });
  canvas.addEventListener('mouseleave', () => {
    game.G.hover = null;
  });
  canvas.addEventListener('click', (ev) => {
    const G = game.G;
    const cell = cellFromEvent(ev);
    if (!cell) return;
    if (G.state !== 'playing') return;
    if (G.buildType) {
      game.tryPlace(G.buildType, cell.col, cell.row);
    } else {
      game.selectAt(cell.col, cell.row);
    }
  });
  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    game.selectBuild(null);
    game.selectTower(null);
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    const G = game.G;
    const k = ev.key.toLowerCase();
    if (k >= '1' && k <= '4') {
      const type = TOWER_ORDER[Number(k) - 1];
      if (G.state === 'playing') {
        game.selectBuild(G.buildType === type ? null : type);
      }
    } else if (k === 'escape') {
      if (G.buildType) game.selectBuild(null);
      else if (G.selected) game.selectTower(null);
      else if (G.state === 'playing' || G.state === 'paused') game.togglePause();
    } else if (k === ' ') {
      ev.preventDefault();
      if (G.state === 'playing' || G.state === 'paused') game.togglePause();
      else if (G.state === 'title') game.startGame();
    } else if (k === 'f') {
      if (G.state === 'playing') game.toggleSpeed();
    } else if (k === 'r') {
      if (G.state !== 'title') game.restart();
    } else if (k === 'd') {
      if (G.state === 'playing') game.fireDawn();
    } else if (k === 'm') {
      game.toggleMute();
    } else if (k === 'enter') {
      if (G.state === 'title') game.startGame();
      else if (G.state === 'victory' || G.state === 'defeat') game.restart();
    }
  });
}
