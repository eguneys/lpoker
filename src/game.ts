export type Chips = number

export class PotsShared {
  tie_share?: [Chips, Chips]
  winner_share?: [Chips, Chips]
  side_bets?: [Chips, Chips]
}

export type BettingRoundType = 'preflop' | 'flop' | 'turn' | 'river'
export const next_round_type = {
  'preflop': 'flop',
  'flop': 'turn',
  'turn': 'river'
}

export abstract class BetAction {

  static match = (a: BetAction, b: BetAction) => {
    if (a instanceof Fold) {
      return b instanceof Fold
    }
    if (a instanceof Check) {
      return b instanceof Check
    }
    if (a instanceof AllIn) {
      return b instanceof AllIn
    }
    if (a instanceof Call && b instanceof Call) {
      return a.match === b.match
    }

    if (a instanceof Raise && b instanceof Raise) {

      return a.match === b.match && a.raise! >= b.raise!
    }
    return false
  }

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

  fold() {
    this.folded_stack = this.acting_turn
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


    let side_bets = this.bets[acting_turn] - this.bets[other_turn]

    if (side_bets > 0) {

      this.bets[acting_turn] -= side_bets
      this.side_bets = [0, 0]
      this.side_bets[acting_turn] = side_bets
    }
  }

  call(action: Call) {
    let { acting_turn } = this
    
    this.bets[acting_turn] += action.match!
    this.stacks[acting_turn] -= action.match!

    this.acting_turn = (this.acting_turn + 1) % 2
  }

  raise(action: Raise) {
    let { acting_turn } = this

    this.bets[acting_turn] += action.match! + action.raise!
    this.stacks[acting_turn] -= action.match! + action.raise!

    this.acting_turn = (this.acting_turn + 1) % 2
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

    let pots_shared = new PotsShared()

    if (this.side_bets) {
      pots_shared.side_bets = [0, 0]
      if (this.side_bets[0] > 0) {
        pots_shared.side_bets[0] = this.side_bets[0]
        this.stacks[0] += this.side_bets[0]
      }
      if (this.side_bets[1] > 0) {
        pots_shared.side_bets[1] = this.side_bets[1]
        this.stacks[1] += this.side_bets[1]
      }
    }



    if (action.tie) {
      let share = this.pot / 2
      this.stacks[0] += share
      this.stacks[1] += share

      pots_shared.tie_share = [share, share]
    } else {
      pots_shared.winner_share = [0, 0]
      pots_shared.winner_share[action.winner] = this.pot
      this.stacks[action.winner] = this.pot
    }

    this.pots_shared = pots_shared
  }

  fold_share_pots() {
    if (this.folded_stack === undefined) {
      throw 'No folded stack cant share'
    }

    this.pot += this.bets[0]
    this.pot += this.bets[1]
    this.bets = [0, 0]

    let winner = (this.folded_stack + 1) % 2

    this.stacks[winner] = this.pot
    let pots_shared = new PotsShared()
    pots_shared.winner_share = [0, 0]
    pots_shared.winner_share[winner] = this.pot

    this.pots_shared = pots_shared
  }

  side_bets?: [Chips, Chips]
  pot!: Chips
  bets!: [Chips, Chips]
  round_type!: BettingRoundType
  has_everyone_acted!: boolean

  acting_turn!: number

  folded_stack?: number

  pots_shared?: PotsShared

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

  get acting_turn() {
    return this.running_round?.acting_turn
  }

  get stack_actions() {
    return this.running_round?.stack_actions
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

  try_dealer_action(action: DealerAction) {
    if (this.running_round && this.dealer_action) {

      if (this.dealer_action === NextBettingRound && action instanceof NextBettingRound) {
        this.running_round.next_betting_round()
        return true
      } else if (this.dealer_action === ShowdownSharePots && action instanceof ShowdownSharePots) {
        this.running_round.showdown_share_pots(action)
        return true
      } else if (this.dealer_action === FoldSharePots && action instanceof FoldSharePots) {
        this.running_round.fold_share_pots()
        return true
      }
    }
    return false
  }

  try_stack_action(turn: number, action: BetAction) {
    if (this.running_round?.acting_turn !== turn) {
      return false
    }
    if (this.stack_actions?.find(_ => BetAction.match(action, _))) {
      if (action instanceof Fold) {
        this.running_round.fold()
        return true
      } else if (action instanceof Check) {
        this.running_round.check()
        return true
      } else if (action instanceof AllIn) {
        this.running_round.allin()
        return true
      } else if (action instanceof Call) {
        this.running_round.call(action)
        return true
      } else if (action instanceof Raise) {
        this.running_round.raise(action)
        return true
      }
    }
    return false
  }
}


export class HeadsUpGameTimed {

  static make = (game: HeadsUpGame) => {
    let res = new HeadsUpGameTimed(game)
    return res
  }

  timed_turn?: number
  timestamp!: number

  timed_dealer?: true

  constructor(readonly game: HeadsUpGame) {
  }

  deal() {
    if (this.game.can_deal) {
      this.game.deal()
      this.timed_dealer = undefined
      this.timed_turn = this.game.acting_turn!
      this.timestamp = Date.now()
    }
  }

  try_stack_action(turn: number, action: BetAction) {
    if (this.game.try_stack_action(turn, action)) {
      if (this.game.dealer_action) {
        this.timed_dealer = true
        this.timestamp = Date.now()
      } else if (this.game.stack_actions) {
        this.timed_turn = this.game.acting_turn!
        this.timestamp = Date.now()
      }
    }
  }

  try_dealer_action(action: DealerAction) {
    if (this.game.try_dealer_action(action)) {
      if (this.game.can_collect_round) {
        this.game.collect_round()
      } else if (this.game.stack_actions) {
        this.timed_turn = this.game.acting_turn!
        this.timestamp = Date.now()
      }
    }
  }

}
