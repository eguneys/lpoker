export type Chips = number

export type BettingRoundType = 'preflop' | 'flop' | 'turn' | 'river'
export const next_round_type = {
  'preflop': 'flop',
  'flop': 'turn',
  'turn': 'river'
}

export abstract class BetAction {
  match?: number
  raise?: number

  get total() {
    return 0 + (this.match ?? 0) + (this.raise ?? 0)
  }
}

export class Raise extends BetAction {
  static make = (to_call: number, to_raise: number) => {
    let res = new Raise()
    res.match = to_call
    res.raise = to_raise
    return res
  }
}
export class Call extends BetAction {
  static make = (to_call: number) => {
    let res = new Call()
    res.match = to_call
    return res
  }
}
export class Fold extends BetAction {
  static make = new Fold()
}
export class AllIn extends BetAction {
  static make = new AllIn
}
export class Check extends BetAction {
  static make = new Check()
}

export class DealerAction {}

export class NextBettingRound extends DealerAction {
}

export class ShowdownSharePots extends DealerAction {
  winner!: number
  tie?: true
}

export class FoldSharePots extends DealerAction {}

export type HeadsUpRoundAction = BetAction | DealerAction

export class HeadsUpRound {

  static make = (stacks: [Chips, Chips], small_blind: number) => {
    let big_blind = small_blind * 2
    let _stacks: [Chips, Chips] = [stacks[0] - small_blind, stacks[1] - big_blind]
    let _bets: [Chips, Chips] = [small_blind, big_blind]
    let res = new HeadsUpRound(_stacks, small_blind)
    res.pot = 0
    res.bets = _bets
    res.has_everyone_acted = false
    res.acting_turn = 0
    res.pots_shared = false
    res.side_pot_max_share = [_stacks[0], _stacks[1]]

    return res
  }

  get dealer_action() {

    let bets_equal = this.bets[0] === this.bets[1]
    let betting_rounds_settled = bets_equal && this.has_everyone_acted

    if (betting_rounds_settled) {
      if (this.round_type === 'river') {
        return ShowdownSharePots
      } else {
        let one_allin = this.stacks[0] === 0
        let two_allin = this.stacks[1] === 0
        if (one_allin || two_allin) {
          return ShowdownSharePots
        }
        return NextBettingRound
      }
    }

    if (this.folded_stack !== undefined) {
      return FoldSharePots
    }

    let everyone_allin = this.stacks[0] === 0 && this.stacks[1] === 0
    if (everyone_allin) {
      return ShowdownSharePots
    }

    return undefined
  }

  get stack_actions() {
    let res: Array<BetAction> = [Fold.make]

    let { acting_turn } = this
    let other_turn = (acting_turn + 1) % 2

    if (this.bets[acting_turn] === this.bets[other_turn]) {
      res.push(Check.make)
    }

    let to_call = this.bets[other_turn] - this.bets[acting_turn]

    let _stack = this.stacks[acting_turn]

    if (_stack <= to_call) {
      res.push(AllIn.make)
      return res
    }

    if (to_call > 0) {
      res.push(Call.make(to_call))
    }

    let to_raise = _stack - to_call
    if (to_raise > this.small_blind) {
      res.push(Raise.make(to_call, to_raise))
    }

    return res
  }


  check() {
    if (!this.has_everyone_acted) {
      if (this.acting_turn === 1) {
        this.has_everyone_acted = true
      }
    }
    this.acting_turn = (this.acting_turn + 1) % 2
  }


  allin() {

    let { acting_turn } = this
    let other_turn = (acting_turn + 1) % 2

    let _stack = this.stacks[acting_turn]

    this.bets[acting_turn] += _stack
    this.stacks[acting_turn] = 0
  }

  call(action: Call) {
    let { acting_turn } = this
    
    this.bets[acting_turn] += action.match!
    this.stacks[acting_turn] -= action.match!
  }

  raise(action: Raise) {
    let { acting_turn } = this

    this.bets[acting_turn] += action.match! + action.raise!
    this.stacks[acting_turn] -= action.match! + action.raise!
  }


  next_betting_round() {
    if (this.round_type === 'river') {
      throw 'No next betting round after river'
    }

    this.pot += this.bets[0]
    this.pot += this.bets[1]

    this.bets = [0, 0]

    this.round_type = next_round_type[this.round_type] as BettingRoundType
    this.has_everyone_acted = false
    this.acting_turn = 1
  }

  showdown_share_pots(action: ShowdownSharePots) {

    this.pot += this.bets[0]
    this.pot += this.bets[1]
    this.bets = [0, 0]

    this.pots_shared = true

    let { side_pot_max_share } = this

    let [max_share_one, max_share_two] = side_pot_max_share
    if (max_share_one !== 0 && max_share_one < this.pot) {
      let return_to_two = this.pot - max_share_one
      this.stacks[1] += return_to_two
      this.pot -= return_to_two
    } else if (max_share_two !== 0 && max_share_two < this.pot) {
      let return_to_one = this.pot - max_share_two
      this.stacks[0] += return_to_one
      this.pot -= return_to_one
    }

    if (action.tie) {
      let share = this.pot / 2
      this.stacks[0] += share
      this.stacks[1] += share
    } else {
      this.stacks[action.winner] = this.pot
    }
  }

  fold_share_pots() {
    if (this.folded_stack === undefined) {
      throw 'No folded stack cant share'
    }

    this.pot += this.bets[0]
    this.pot += this.bets[1]
    this.bets = [0, 0]


    this.pots_shared = true


    let winner = (this.folded_stack + 1) % 2

    this.stacks[winner] = this.pot
  }

  side_pot_max_share!: [Chips, Chips]
  pot!: Chips
  bets!: [Chips, Chips]
  round_type!: BettingRoundType
  has_everyone_acted!: boolean

  acting_turn!: number

  folded_stack?: number

  pots_shared?: boolean

  constructor(readonly stacks: [Chips, Chips], readonly small_blind: number) {}
}

export class HeadsUpGame {

  static make = (blinds: number) => {
    let res = new HeadsUpGame([blinds * 100, blinds * 100])

    res.blinds = blinds
    res.hand_no = 0
    res.button = 0
    return res
  }

  button!: number
  blinds!: number
  hand_no!: number

  running_round?: HeadsUpRound

  constructor(readonly stacks: [Chips, Chips]) {}

  get winner() {
    if (this.stacks[0] === 0) {
      return 1
    }
    if (this.stacks[1] === 0) {
      return 0
    }
    return undefined
  }

  get running() {
    return this.stacks[0] > 0 && this.stacks[1] > 0
  }

  get can_deal() {
    return this.running && !this.running_round
  }

  get can_collect_round() {
    return this.running && this.running_round && this.running_round.pots_shared
  }

  get dealer_action() {
    return this.running_round?.dealer_action
  }

  deal() {
    let { button } = this
    this.hand_no++;
    this.running_round = HeadsUpRound.make([this.stacks[button], this.stacks[(button + 1) % 2]], this.blinds)
  }

  collect_round() {
    let { button } = this
    let { stacks } = this.running_round!

    this.stacks[button] = stacks[0]
    this.stacks[(button + 1) % 2] = stacks[1]

    this.running_round = undefined
  }
}
