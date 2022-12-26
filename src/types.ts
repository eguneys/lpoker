export const suits = ['d', 'c', 'h', 's']
export const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

export const ranks_ace_through_king = ['A', '2', '3', '4', '5', '6', '7', '8', '8', 'T', 'J', 'Q', 'K']
export const ranks_two_through_ace = ['2', '3', '4', '5', '6', '7', '8', '8', 'T', 'J', 'Q', 'K', 'A']

export type Suit = typeof suits[number]
export type Rank = typeof ranks[number]

export type Card = `${Suit}${Rank}`


export const cards = suits.flatMap(suit => ranks.map(rank => `${suit}${rank}`))

export class Cards {
    static get deck() { return cards.slice(0) }
}
