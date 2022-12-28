export type ChipLabelType = `pot` | `stack` | `smallblind` | `bigblind` | `bet` | `raise` | `check` | `fold` | `call` | `allin` | `potwinner` | `potshare` | `sidepot`
export type Position = '0' | '1'
export type ChipLabel = `${Position}${ChipLabelType}`

export type Chips = `${ChipLabel} ${number}` | `${ChipLabel}`

export type Transfer = `${ChipLabel}>${Chips}` | `${ChipLabel}>void`

const next = (position: Position): Position => position === '0' ? '1' : '0'
const bets = [`smallblind`, `bigblind`, `bet`, `raise`, `check`, `fold`, `call`, `allin`]

export class Table {

  static make = (stacks: [number, number]) => {
    const stack0 = `0stack`
    const stack1 = `1stack`
    let chips_stack0 = `${stack0} ${stacks[0]}`
    let chips_stack1 = `${stack1} ${stacks[1]}`

    let chips = new Map()
    chips.set(stack0, chips_stack0)
    chips.set(stack1, chips_stack1)

    let res = new Table(chips)
    return res
  }

  constructor(readonly chips: Map<ChipLabel, Chips>) {}


  bet(turn: Position, amount: number): Transfer {
    return `${turn}stack>${turn}bet ${amount}`
  }

  raise(turn: Position, amount: number): Transfer {
    return `${turn}stack>${turn}raise ${amount}`
  }

  call(turn: Position, amount: number): Transfer {
    return `${turn}stack>${turn}call ${amount}`
  }

  check(turn: Position): Transfer {
    return `${turn}stack>${turn}check`
  }

  fold(turn: Position): Transfer {
    return `${turn}stack>${turn}fold`
  }

  post_blinds(ismall_blind: Position, small_blind: number): Array<Transfer> {
    let big_blind = small_blind * 2
    let ibig_blind = next(ismall_blind)

    return [
      `${ismall_blind}stack>${ismall_blind}smallblind ${small_blind}`,
      `${ibig_blind}stack>${ibig_blind}bigblind ${big_blind}`
    ]
  }

  bets_to_pot(): Array<Transfer> {

    let res: Array<Transfer> = []
    for (let [label, chips] of this.chips) {
      let position: Position = label[0] as Position
      let labeltype: ChipLabelType = label.slice(1) as ChipLabelType

      if (bets.includes(labeltype)) {
        let [_, amount] = chips.split(' ')
        if (amount) {
          let transfer: Transfer = `${position}${labeltype}>${position}pot ${parseInt(amount)}`
          res.push(transfer)
        } else {
          let transfer: Transfer = `${position}${labeltype}>void`
          res.push(transfer)
        }
      }
    }
    return res
  }

}

