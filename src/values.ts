import { Card, ranks_ace_through_king } from './types'

export type CardEval = {
  ace_high: [Card, Card, Card, Card, Card],
  best_two_pair?: [[Card, Card], Card],
  second_best_two_pair?: [[Card, Card], Card],
  set?: [[Card, Card, Card], Card],
  quads?: [[Card, Card, Card, Card], Card],
  straight?: [Card, Card, Card, Card, Card]
  flush?: [Card, Card, Card, Card, Card]
}

function get_hand_eval(hand: [Card, Card, Card, Card, Card]) {
  let ace_high = hand.sort((a, b) => ranks_ace_through_king.indexOf(b[1]) - ranks_ace_through_king.indexOf(a[1]))

}
