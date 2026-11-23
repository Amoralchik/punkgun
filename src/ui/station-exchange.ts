import type { Profile } from '../game/profile';
import { TICKERS } from '../game/exchange';
import { t } from '../core/i18n';

function sparkline(points: number[], color: string): string {
  if (points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const coords = points
    .map((price, index) => {
      const x = (index / (points.length - 1)) * 120;
      const y = 25 - ((price - min) / span) * 22;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return `<svg class="exchange-spark" viewBox="0 0 120 28" aria-hidden="true">
    <polyline points="${coords}" fill="none" stroke="${color}" stroke-width="2" />
  </svg>`;
}

export function renderExchange(profile: Profile): string {
  const state = profile.data.exchange;
  const rows = TICKERS.map((ticker) => {
    const price = profile.exchangePrice(ticker.id);
    const history = profile.exchangeHistory(ticker.id);
    const first = history[0] ?? price;
    const change = first > 0 ? ((price - first) / first) * 100 : 0;
    const held = profile.exchangeHoldings(ticker.id);
    const value = held * price;
    const canBuy = profile.data.money >= price;
    const canSell = held > 0;
    return `<div class="exchange-row" style="--ticker:${ticker.color}">
      <div class="exchange-id">
        <span class="exchange-code">${ticker.code}</span>
        <span class="exchange-name">${ticker.name}</span>
        <small>$${ticker.dividend} DIV / CLEAR</small>
      </div>
      <div class="exchange-price">
        <b>$${price}</b>
        <small class="${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '+' : ''}${change.toFixed(1)}%</small>
        ${sparkline(history, ticker.color)}
      </div>
      <div class="exchange-holdings">
        <span>${held} SHARES</span>
        <small>VALUE $${value.toLocaleString('en-US')}</small>
      </div>
      <div class="exchange-actions">
        <button data-act="stock-buy" data-id="${ticker.id}" data-qty="1" ${canBuy ? '' : 'disabled'}>BUY 1</button>
        <button data-act="stock-buy" data-id="${ticker.id}" data-qty="5" ${canBuy ? '' : 'disabled'}>BUY 5</button>
        <button data-act="stock-sell" data-id="${ticker.id}" data-qty="1" ${canSell ? '' : 'disabled'}>SELL 1</button>
        <button data-act="stock-sell" data-id="${ticker.id}" data-qty="all" ${canSell ? '' : 'disabled'}>SELL ALL</button>
      </div>
    </div>`;
  }).join('');
  return `<div class="station-grid exchange-grid">
    <section class="station-col exchange-main">
      <div class="kicker">// BLACK EXCHANGE</div>
      <h2>THE EXCHANGE</h2>
      <p class="sh-note">${t('station.note.exchange1')}</p>
      <div class="exchange-list">${rows}</div>
      <button class="sh-augments" data-act="open-market">BACK TO MARKET</button>
    </section>
    <section class="station-col">
      <div class="kicker">// POSITION</div>
      <h2>PORTFOLIO</h2>
      <div class="op-progress">
        <span>DAY <b>${state.day}</b></span>
        <span>CASH <b>$${profile.data.money.toLocaleString('en-US')}</b></span>
        <span>HOLDINGS <b>${TICKERS.reduce((sum, ticker) => sum + profile.exchangeHoldings(ticker.id), 0)}</b></span>
      </div>
      <p class="sh-note">${t('station.note.exchange2')}</p>
    </section>
  </div>`;
}
