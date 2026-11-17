# makefun-btc-race-24h

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/xiangbingxi/makefun-btc-race-24h/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/xiangbingxi/makefun-btc-race-24h/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A BTC (cbBTC/USDC) range-trading bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty. The dev window is choppy, not trending, so instead of chasing crossovers it buys the bottom 20% of the trailing 8-hour high/low range and sells the top 20%, with a 1.5% stop-loss. Dev window: about +$21 net PnL, 5 trades, ~0.75% max drawdown.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1 on stdin/stdout (see the kit's `protocol.schema.json`). To grade it locally against the dev window, from the unpacked kit directory:

```sh
node cli/makefun.mjs grade-local --kit . --bot <path-to-this-repo> --driver process --json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=mellow-wren-31&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
