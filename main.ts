// Range trader for the make.fun BTC race (agent-fun/bars-replay/v1).
//
// Idea: the dev window is choppy, not trending — fast crossovers whipsaw to
// death (the EMA(8)/EMA(21) baseline loses ~$106 on dev). This bot instead
// trades the range: over the trailing 480 one-minute bars (8h) it tracks the
// high/low range and buys only when the close sits in the bottom 20% of that
// range, and sells when it reaches the top 20%. A 1.5% stop-loss from the
// entry close caps the damage if a "dip" turns out to be a real downtrend,
// with a 60-bar cooldown before re-entering after a stop-out.
//
// Backtested on the dev window (Python replica of the fill model, then
// confirmed with the kit's grade-local): net PnL about +$21, 5 trades,
// max drawdown about 0.75%. Neighbouring parameter sets (window 360-600,
// buy/sell 0.15-0.25 / 0.75-0.85) all stay profitable on dev, so the edge
// is a plateau, not a single tuned point.
//
// Long only, at most one open position, full-size entries (100% of cash),
// at most one order per batch. Deterministic: no clock, no randomness,
// no network, standard library only (plus the vendored SDK shim).

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Trailing window for the high/low range, in bars (480 min = 8h). */
const RANGE_BARS = 480;
/** Buy when close is below this fraction of the trailing range. */
const BUY_FRAC_NUM = 1n;
const BUY_FRAC_DEN = 5n; // 0.20
/** Sell when close is above this fraction of the trailing range. */
const SELL_FRAC_NUM = 4n;
const SELL_FRAC_DEN = 5n; // 0.80
/** Stop-loss: sell if close falls this far below the entry close (1.5%). */
const STOP_NUM = 985n;
const STOP_DEN = 1000n;
/** Bars to wait after a stop-out before buying again. */
const STOP_COOLDOWN_BARS = 60;
/** Max slippage vs the latest close, in bps (fills move ~13 bps on a full-size trade). */
const MAX_SLIPPAGE_BPS = 100;

/** Closes, highs and lows seen so far, in price units (bigint, price_scale 8). */
const closes: bigint[] = [];
const highs: bigint[] = [];
const lows: bigint[] = [];
/** Close at which the current position was entered (decision-bar close). */
let entryClose: bigint | null = null;
/** Seq of the last stop-loss exit; no buys until this + STOP_COOLDOWN_BARS. */
let lastStopSeq = -10_000;

function rangeExtremes(): { lo: bigint; hi: bigint } | null {
  const n = closes.length;
  if (n < RANGE_BARS) return null;
  let lo = lows[n - 1];
  let hi = highs[n - 1];
  for (let i = n - RANGE_BARS; i < n; i++) {
    if (lows[i] < lo) lo = lows[i];
    if (highs[i] > hi) hi = highs[i];
  }
  return { lo, hi };
}

await runBars({
  onBatch(state: BarsState): OrderInput[] {
    const bar = state.latest.get(SYMBOL);
    if (bar === undefined) return [];
    closes.push(BigInt(bar.c));
    highs.push(BigInt(bar.h));
    lows.push(BigInt(bar.l));

    if (state.warmingUp) return [];
    const held = state.positions.get(SYMBOL);
    const holding = held !== undefined && held.qty > 0n;
    const close = BigInt(bar.c);

    // Stop-loss first: it overrides the range signal.
    if (holding && entryClose !== null && close * STOP_DEN < entryClose * STOP_NUM) {
      lastStopSeq = state.seq;
      entryClose = null;
      return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }

    const range = rangeExtremes();
    if (range === null || range.hi <= range.lo) return [];
    const span = range.hi - range.lo;
    const fromLo = close - range.lo;

    if (!holding) {
      // Buy the bottom of the range: fromLo / span < 0.20, after any stop cooldown.
      if (
        fromLo * BUY_FRAC_DEN < span * BUY_FRAC_NUM &&
        state.seq - lastStopSeq >= STOP_COOLDOWN_BARS &&
        state.cash > 0n
      ) {
        entryClose = close;
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    // Holding: sell the top of the range: fromLo / span > 0.80.
    if (fromLo * SELL_FRAC_DEN > span * SELL_FRAC_NUM) {
      entryClose = null;
      return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
