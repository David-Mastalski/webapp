import { calculate_price_sqrt, DENOMINATOR, MAX_TICK, MIN_TICK } from '@invariant-labs/sdk'
import { PoolStructure, Tick } from '@invariant-labs/sdk/src/market'
import { parseLiquidityOnTicks } from '@invariant-labs/sdk/src/utils'
import { BN } from '@project-serum/anchor'
import { PlotTickData } from '@reducers/positions'
import { u64 } from '@solana/spl-token'
import { NetworkType, PRICE_DECIMAL, tokens } from './static'

export const tou64 = (amount: BN | String) => {
  // eslint-disable-next-line new-cap
  return new u64(amount.toString())
}
export const transformBN = (amount: BN): string => {
  // eslint-disable-next-line new-cap
  return (amount.div(new BN(1e2)).toNumber() / 1e4).toString()
}
export const printBN = (amount: BN, decimals: number): string => {
  const balanceString = amount.toString()
  if (balanceString.length <= decimals) {
    return '0.' + '0'.repeat(decimals - balanceString.length) + balanceString
  } else {
    return trimZeros(
      balanceString.substring(0, balanceString.length - decimals) +
        '.' +
        balanceString.substring(balanceString.length - decimals)
    )
  }
}
// Bad solution but i hate regex
export const trimZeros = (amount: string) => {
  try {
    return parseFloat(amount).toString()
  } catch (error) {
    return amount
  }
}
export const printBNtoBN = (amount: string, decimals: number): BN => {
  const balanceString = amount.split('.')
  if (balanceString.length !== 2) {
    return new BN(balanceString[0] + '0'.repeat(decimals))
  }
  // console.log(balanceString[1].length)
  if (balanceString[1].length <= decimals) {
    return new BN(
      balanceString[0] + balanceString[1] + '0'.repeat(decimals - balanceString[1].length)
    )
  }
  return new BN(0)
}
export interface ParsedBN {
  BN: BN
  decimal: number
}
export const stringToMinDecimalBN = (value: string): ParsedBN => {
  if (value.includes('.')) {
    const [before, after] = value.split('.')
    return {
      BN: new BN(`${before}${after}`),
      decimal: after.length || 0
    }
  }
  return {
    BN: new BN(value),
    decimal: 0
  }
}
export const capitalizeString = (str: string) => {
  if (!str) {
    return str
  }
  return str[0].toUpperCase() + str.substr(1).toLowerCase()
}

export const divUp = (a: BN, b: BN): BN => {
  return a.add(b.subn(1)).div(b)
}
export const divUpNumber = (a: number, b: number): number => {
  return Math.ceil(a / b)
}
export const removeTickerPrefix = (ticker: string, prefix: string[] = ['x', '$']): string => {
  const index = prefix.findIndex(p => ticker.startsWith(p))
  if (index && prefix[index]) {
    return ticker.substring(prefix[index].length)
  }
  return ticker
}

export interface PrefixConfig {
  B?: number
  M?: number
  K?: number
}

const defaultPrefixConfig: PrefixConfig = {
  B: 1000000000,
  M: 1000000,
  K: 10000
}

export const showPrefix = (nr: number, config: PrefixConfig = defaultPrefixConfig): string => {
  if (typeof config.B !== 'undefined' && nr >= config.B) {
    return 'B'
  }

  if (typeof config.M !== 'undefined' && nr >= config.M) {
    return 'M'
  }

  if (typeof config.K !== 'undefined' && nr >= config.K) {
    return 'K'
  }

  return ''
}

export interface FormatNumberThreshold {
  value: number
  decimals: number
  divider?: number
}

const defaultThresholds: FormatNumberThreshold[] = [
  {
    value: 10,
    decimals: 4
  },
  {
    value: 1000,
    decimals: 2
  },
  {
    value: 10000,
    decimals: 1
  },
  {
    value: 1000000,
    decimals: 2,
    divider: 1000
  },
  {
    value: 1000000000,
    decimals: 2,
    divider: 1000000
  },
  {
    value: Infinity,
    decimals: 2,
    divider: 1000000000
  }
]

export const formatNumbers =
  (thresholds: FormatNumberThreshold[] = defaultThresholds) =>
  (value: string) => {
    const num = Number(value)
    const threshold = thresholds.sort((a, b) => a.value - b.value).find(thr => num < thr.value)

    return threshold ? (num / (threshold.divider ?? 1)).toFixed(threshold.decimals) : value
  }

export const nearestPriceIndex = (price: number, data: Array<{ x: number; y: number }>) => {
  let nearest = 0

  for (let i = 1; i < data.length; i++) {
    if (Math.abs(data[i].x - price) < Math.abs(data[nearest].x - price)) {
      nearest = i
    }
  }

  return nearest
}

export const getScaleFromString = (value: string): number => {
  const parts = value.split('.')

  if ((parts?.length ?? 0) < 2) {
    return 0
  }

  return parts[1]?.length ?? 0
}

export const logBase = (x: number, b: number): number => Math.log(x) / Math.log(b)

export const calcTicksAmountInRange = (min: number, max: number, tickSpacing: number): number => {
  const minIndex = logBase(min, 1.0001)
  const maxIndex = logBase(max, 1.0001)

  return Math.ceil((maxIndex - minIndex) / tickSpacing)
}

export const calcYPerXPrice = (sqrtPrice: BN, xDecimal: number, yDecimal: number): number => {
  const proportion = sqrtPrice.mul(sqrtPrice).div(DENOMINATOR)

  const amount = printBNtoBN('1', xDecimal).mul(proportion).div(DENOMINATOR)

  return +printBN(amount, yDecimal)
}

export const multiplicityLowerThan = (arg: number, spacing: number): number => {
  return arg - (Math.abs(arg) % Math.abs(spacing))
}

export const multiplicityGreaterThan = (arg: number, spacing: number): number => {
  return arg + (Math.abs(arg) % Math.abs(spacing))
}

export const arrayIndexFromTickIndex = (index: number, spacing: number): number => {
  const lowest = multiplicityGreaterThan(MIN_TICK, spacing)

  return (index - lowest) / spacing
}

export const createLiquidityPlot = (
  rawTicks: Tick[],
  pool: PoolStructure,
  isXtoY: boolean,
  networkType: NetworkType
) => {
  const tokenXDecimal =
    tokens[networkType].find(token => token.address.equals(pool.tokenX))?.decimal ?? 0
  const tokenYDecimal =
    tokens[networkType].find(token => token.address.equals(pool.tokenY))?.decimal ?? 0

  const parsedTicks = rawTicks.length ? parseLiquidityOnTicks(rawTicks, pool) : []

  const ticks = rawTicks.map((raw, index) => ({
    ...raw,
    liqudity: parsedTicks[index].liquidity
  }))

  const ticksData: PlotTickData[] = []

  const min = multiplicityGreaterThan(MIN_TICK, pool.tickSpacing)
  const max = multiplicityLowerThan(MAX_TICK, pool.tickSpacing)

  for (let i = min; i <= max; i += pool.tickSpacing) {
    const price = calcYPerXPrice(calculate_price_sqrt(i).v, tokenXDecimal, tokenYDecimal)

    ticksData.push({
      x: isXtoY ? price : price !== 0 ? 1 / price : Number.MAX_SAFE_INTEGER,
      y: 0,
      index: i
    })
  }

  ticks.forEach((tick, index) => {
    const arrayIndex = arrayIndexFromTickIndex(tick.index, pool.tickSpacing)

    ticksData[arrayIndex].y = +printBN(tick.liqudity, PRICE_DECIMAL)

    if (
      index < ticks.length - 1 &&
      ticks[index + 1].index - ticks[index].index > pool.tickSpacing
    ) {
      for (
        let i = ticks[index].index + pool.tickSpacing;
        i < ticks[index + 1].index;
        i += pool.tickSpacing
      ) {
        const innerArrayIndex = arrayIndexFromTickIndex(i, pool.tickSpacing)

        ticksData[innerArrayIndex].y = +printBN(tick.liqudity, PRICE_DECIMAL)
      }
    }
  })

  return isXtoY ? ticksData : ticksData.reverse()
}

export const createPlaceholderLiquidityPlot = (
  pool: PoolStructure,
  isXtoY: boolean,
  yValueToFill: number,
  networkType: NetworkType
) => {
  const tokenXDecimal =
    tokens[networkType].find(token => token.address.equals(pool.tokenX))?.decimal ?? 0
  const tokenYDecimal =
    tokens[networkType].find(token => token.address.equals(pool.tokenY))?.decimal ?? 0

  const ticksData: PlotTickData[] = []

  const min = multiplicityGreaterThan(MIN_TICK, pool.tickSpacing)
  const max = multiplicityLowerThan(MAX_TICK, pool.tickSpacing)

  for (let i = min; i <= max; i += pool.tickSpacing) {
    const price = calcYPerXPrice(calculate_price_sqrt(i).v, tokenXDecimal, tokenYDecimal)

    ticksData.push({
      x: isXtoY ? price : price !== 0 ? 1 / price : Number.MAX_SAFE_INTEGER,
      y: yValueToFill,
      index: i
    })
  }

  return isXtoY ? ticksData : ticksData.reverse()
}