/**
 * Educational content for Sui object types
 *
 * Three-tier content system:
 * - Tier 1: "What is this?" - Always visible, icon + metaphor + 1-liner
 * - Tier 2: "Why is it here?" - Context-aware explanation for THIS transaction
 * - Tier 3: "Learn more" - Link to docs for deeper understanding
 */

export interface ObjectEducation {
  icon: string
  metaphor: string // Visual metaphor for quick understanding
  shortDesc: string // 1-sentence explanation
  whatIs: string // Expanded "What is this?" explanation
  whyHere: (context: TransactionContext) => string // Context-aware explanation
  learnMore?: string // Link to docs
}

export interface TransactionContext {
  action: 'created' | 'mutated' | 'transferred' | 'deleted'
  amount?: string // For balance changes
  tokenSymbol?: string // e.g., "SUI", "USDC"
  direction?: 'in' | 'out'
  functionCalled?: string
}

/**
 * Curated content for the 15 most common Sui object types
 */
export const OBJECT_EDUCATION: Record<string, ObjectEducation> = {
  // Core types
  Coin: {
    icon: '💰',
    metaphor: 'Digital cash',
    shortDesc: 'Fungible tokens like SUI or USDC - any unit is interchangeable.',
    whatIs:
      'A Coin is a fungible token on Sui. Like physical money, one SUI is worth the same as any other SUI. Coins can be split, merged, and transferred freely.',
    whyHere: (ctx) => {
      if (ctx.action === 'created') return 'A new Coin was created to hold tokens received in this transaction.'
      if (ctx.action === 'mutated') return 'This Coin\'s balance changed - tokens were added or removed.'
      if (ctx.action === 'transferred') return `This Coin was sent to a new owner.`
      if (ctx.action === 'deleted') return 'This Coin was consumed (merged into another or spent entirely).'
      return 'This Coin was involved in the transaction.'
    },
    learnMore: 'https://docs.sui.io/concepts/sui-move-concepts/coins'
  },

  Pool: {
    icon: '🏊',
    metaphor: 'Shared piggy bank for trading',
    shortDesc: 'A liquidity pool where people deposit tokens to enable swaps.',
    whatIs:
      'A Pool holds reserves of two different tokens (like SUI and USDC). When you swap tokens, you\'re trading with this pool. Liquidity providers earn fees from each trade.',
    whyHere: (ctx) => {
      if (ctx.action === 'mutated') return 'The pool\'s reserves changed because someone swapped tokens through it.'
      return 'This pool was accessed during a token swap or liquidity operation.'
    },
    learnMore: 'https://docs.sui.io/guides/developer/defi/dex'
  },

  BalanceManager: {
    icon: '⚖️',
    metaphor: 'Account ledger',
    shortDesc: 'Tracks token balances for an account within a protocol.',
    whatIs:
      'A BalanceManager keeps track of how much of each token an address owns within a specific DeFi protocol. It\'s like a ledger entry that records your position.',
    whyHere: (ctx) => {
      if (ctx.action === 'mutated') return 'Your balance in this protocol was updated.'
      if (ctx.action === 'created') return 'A new balance record was created for this account.'
      return 'This balance tracker was updated with the transaction.'
    }
  },

  StakedSui: {
    icon: '🔒',
    metaphor: 'Locked savings earning interest',
    shortDesc: 'SUI tokens locked to help secure the network, earning rewards.',
    whatIs:
      'When you stake SUI, you delegate it to a validator who helps run the network. In return, you earn staking rewards (currently ~3-4% APY). Your SUI is locked but can be unstaked later.',
    whyHere: (ctx) => {
      if (ctx.action === 'created') return 'SUI was staked with a validator - it\'s now earning rewards.'
      if (ctx.action === 'mutated') return 'The staked amount or rewards changed.'
      if (ctx.action === 'deleted') return 'SUI was unstaked and returned to a regular Coin.'
      return 'This staking position was affected by the transaction.'
    },
    learnMore: 'https://docs.sui.io/concepts/tokenomics/staking'
  },

  // NFT types
  SuiFren: {
    icon: '🐸',
    metaphor: 'Collectible character',
    shortDesc: 'A unique digital collectible from the SuiFrens collection.',
    whatIs:
      'SuiFrens are NFTs (non-fungible tokens) on Sui - each one is unique and owned by a single person. They\'re collectible characters with different traits and accessories.',
    whyHere: (ctx) => {
      if (ctx.action === 'transferred') return 'This SuiFren was sent to a new owner.'
      if (ctx.action === 'mutated') return 'This SuiFren was modified (accessories changed, leveled up, etc.).'
      return 'This SuiFren was involved in the transaction.'
    }
  },

  Kiosk: {
    icon: '🏪',
    metaphor: 'Personal storefront',
    shortDesc: 'A storefront for displaying and selling NFTs with creator royalties.',
    whatIs:
      'A Kiosk is like a personal shop for your NFTs. It ensures creators get royalties when items are sold. NFTs inside a Kiosk can be listed for sale or just displayed.',
    whyHere: (ctx) => {
      if (ctx.action === 'created') return 'A new Kiosk was created for holding NFTs.'
      if (ctx.action === 'mutated') return 'An NFT was added, removed, or sold from this Kiosk.'
      return 'This Kiosk was involved in an NFT transaction.'
    },
    learnMore: 'https://docs.sui.io/standards/kiosk'
  },

  // DeFi types
  Position: {
    icon: '📊',
    metaphor: 'Investment record',
    shortDesc: 'Your stake or position in a DeFi protocol.',
    whatIs:
      'A Position represents your stake in a DeFi protocol - like providing liquidity, lending tokens, or opening a leveraged trade. It tracks what you put in and what you\'re owed.',
    whyHere: (ctx) => {
      if (ctx.action === 'created') return 'A new DeFi position was opened.'
      if (ctx.action === 'mutated') return 'Your position was modified (more added, partially closed, or fees claimed).'
      if (ctx.action === 'deleted') return 'This position was fully closed.'
      return 'This position was updated by the transaction.'
    }
  },

  Vault: {
    icon: '🏦',
    metaphor: 'Secure deposit box',
    shortDesc: 'A secure container that holds assets with specific access rules.',
    whatIs:
      'A Vault is a secure container for assets. It often has special rules - like time locks, multi-signature requirements, or yield-generating strategies.',
    whyHere: (ctx) => {
      if (ctx.action === 'created') return 'A new vault was created to hold assets securely.'
      if (ctx.action === 'mutated') return 'Assets were deposited, withdrawn, or the vault settings changed.'
      return 'This vault was accessed in the transaction.'
    }
  },

  // Governance
  VotingPower: {
    icon: '🗳️',
    metaphor: 'Voting ticket',
    shortDesc: 'Represents your voting weight in protocol governance.',
    whatIs:
      'VotingPower lets you participate in protocol decisions - like changing parameters or approving upgrades. More tokens usually means more voting weight.',
    whyHere: (ctx) => {
      if (ctx.action === 'created') return 'Voting power was delegated or acquired.'
      if (ctx.action === 'mutated') return 'Voting power changed (voted, delegated, or expired).'
      return 'Governance voting power was affected.'
    }
  },

  // Gaming/Collectibles
  Character: {
    icon: '🎮',
    metaphor: 'Game avatar',
    shortDesc: 'A character or avatar in a blockchain game.',
    whatIs:
      'A Character is your in-game identity - it can have stats, equipment, achievements, and history that persist on-chain and can be traded.',
    whyHere: (ctx) => {
      if (ctx.action === 'created') return 'A new character was minted or created.'
      if (ctx.action === 'mutated') return 'The character gained experience, items, or had stats changed.'
      if (ctx.action === 'transferred') return 'This character was traded or gifted to a new owner.'
      return 'This character was involved in a game action.'
    }
  },

  Item: {
    icon: '⚔️',
    metaphor: 'Game equipment',
    shortDesc: 'An in-game item like a weapon, tool, or consumable.',
    whatIs:
      'Items are game assets that can be equipped, used, or traded. Unlike traditional games, blockchain items can be truly owned and sold outside the game.',
    whyHere: (ctx) => {
      if (ctx.action === 'created') return 'A new item was crafted, dropped, or minted.'
      if (ctx.action === 'transferred') return 'This item was traded or equipped to another character.'
      if (ctx.action === 'deleted') return 'This item was consumed or destroyed.'
      return 'This item was involved in a game action.'
    }
  },

  // Infrastructure
  Package: {
    icon: '📦',
    metaphor: 'Code library',
    shortDesc: 'Published Move code that others can use.',
    whatIs:
      'A Package contains Move modules (smart contracts) that anyone can call. Once published, packages are immutable - the code can never change.',
    whyHere: (ctx) => {
      if (ctx.action === 'created') return 'New Move code was published to the network.'
      return 'This package was called during the transaction.'
    },
    learnMore: 'https://docs.sui.io/concepts/sui-move-concepts/packages'
  },

  UpgradeCap: {
    icon: '🔑',
    metaphor: 'Admin key',
    shortDesc: 'Permission to upgrade a Move package.',
    whatIs:
      'An UpgradeCap is like an admin key for smart contract code. Whoever holds it can publish new versions of a package. It\'s critical for protocol security.',
    whyHere: (ctx) => {
      if (ctx.action === 'transferred') return 'Admin control of a package was transferred to a new owner.'
      if (ctx.action === 'deleted') return 'The upgrade capability was destroyed - this package can never be changed.'
      return 'Package upgrade permissions were involved.'
    }
  },

  Clock: {
    icon: '⏰',
    metaphor: 'Network timestamp',
    shortDesc: 'The shared clock that provides the current time on-chain.',
    whatIs:
      'The Clock is a special shared object that provides the current timestamp. Smart contracts use it to implement time-based logic like auctions or vesting.',
    whyHere: () => 'The transaction needed to know the current time (for time-based logic).',
    learnMore: 'https://docs.sui.io/concepts/sui-move-concepts/clock'
  },

  Random: {
    icon: '🎲',
    metaphor: 'Dice roll',
    shortDesc: 'Provides secure randomness for games and lotteries.',
    whatIs:
      'The Random object provides cryptographically secure randomness on-chain. It\'s used for fair games, lotteries, and any logic that needs unpredictable outcomes.',
    whyHere: () => 'The transaction used randomness (for a game, lottery, or random selection).',
    learnMore: 'https://docs.sui.io/guides/developer/advanced/randomness'
  }
}

/**
 * Pattern matching for unknown object types
 * Falls back to these when we don't have curated content
 */
const PATTERN_MATCHES: Array<{ pattern: RegExp, education: ObjectEducation }> = [
  {
    pattern: /pool/i,
    education: {
      icon: '🏊',
      metaphor: 'Liquidity pool',
      shortDesc: 'A pool for trading or providing liquidity.',
      whatIs: 'This appears to be a liquidity pool or trading pool. Pools hold token reserves and enable swaps.',
      whyHere: () => 'This pool was involved in a swap or liquidity operation.'
    }
  },
  {
    pattern: /nft|collectible|art/i,
    education: {
      icon: '🖼️',
      metaphor: 'Digital collectible',
      shortDesc: 'A unique digital collectible (NFT).',
      whatIs: 'This is a non-fungible token (NFT) - a unique digital item that can be collected and traded.',
      whyHere: ctx =>
        ctx.action === 'transferred' ? 'This NFT was sent to a new owner.' : 'This NFT was involved in the transaction.'
    }
  },
  {
    pattern: /stake|staking|staked/i,
    education: {
      icon: '🔒',
      metaphor: 'Staked tokens',
      shortDesc: 'Tokens locked for staking or rewards.',
      whatIs: 'This represents tokens that have been staked - locked up to earn rewards or participate in governance.',
      whyHere: () => 'Staking position was created, modified, or closed.'
    }
  },
  {
    pattern: /vault|safe|treasury/i,
    education: {
      icon: '🏦',
      metaphor: 'Secure storage',
      shortDesc: 'A secure container for assets.',
      whatIs: 'This is a vault or secure container that holds assets with specific access rules.',
      whyHere: () => 'Assets were deposited, withdrawn, or vault settings changed.'
    }
  },
  {
    pattern: /position|margin|leverage/i,
    education: {
      icon: '📊',
      metaphor: 'Trading position',
      shortDesc: 'A trading or investment position.',
      whatIs: 'This represents a position in a DeFi protocol - like providing liquidity or opening a trade.',
      whyHere: () => 'This position was opened, modified, or closed.'
    }
  },
  {
    pattern: /ticket|pass|access/i,
    education: {
      icon: '🎫',
      metaphor: 'Access pass',
      shortDesc: 'A ticket or access pass for something.',
      whatIs: 'This is a ticket or pass that grants access to something - an event, feature, or exclusive content.',
      whyHere: ctx =>
        ctx.action === 'created' ? 'A new pass was issued.' : 'This pass was used or transferred.'
    }
  }
]

/**
 * Default fallback for completely unknown types
 */
const DEFAULT_EDUCATION: ObjectEducation = {
  icon: '📦',
  metaphor: 'Custom object',
  shortDesc: 'A custom object type specific to this application.',
  whatIs:
    'This is a custom object type created by a smart contract. Without more context, we can\'t explain its specific purpose.',
  whyHere: (ctx) => {
    if (ctx.action === 'created') return 'A new object was created.'
    if (ctx.action === 'mutated') return 'This object was modified.'
    if (ctx.action === 'transferred') return 'This object was sent to a new owner.'
    if (ctx.action === 'deleted') return 'This object was deleted.'
    return 'This object was involved in the transaction.'
  }
}

/**
 * Get educational content for an object type
 *
 * @param objectType - Full object type string (e.g., "0x2::coin::Coin<0x2::sui::SUI>")
 * @returns Educational content for this type
 */
export function getObjectEducation(objectType: string): ObjectEducation {
  // Extract the simple type name (e.g., "Coin" from "0x2::coin::Coin<...>")
  const typeName = extractTypeName(objectType)

  // Check curated content first
  if (OBJECT_EDUCATION[typeName]) {
    return OBJECT_EDUCATION[typeName]
  }

  // Try pattern matching
  for (const { pattern, education } of PATTERN_MATCHES) {
    if (pattern.test(typeName) || pattern.test(objectType)) {
      return education
    }
  }

  // Fallback
  return DEFAULT_EDUCATION
}

/**
 * Extract the simple type name from a full object type
 */
function extractTypeName(objectType: string): string {
  // Handle types like "0x2::coin::Coin<0x2::sui::SUI>"
  const match = objectType.match(/::([A-Z][a-zA-Z0-9_]*)(?:<|$)/)
  if (match?.[1]) return match[1]

  // Handle simple names
  const parts = objectType.split('::')
  const lastPart = parts[parts.length - 1]

  // Remove generic parameters
  return lastPart?.replace(/<.*>/, '') || objectType
}

/**
 * Get gas level context
 */
export type GasLevel = 'low' | 'normal' | 'high'

export function getGasLevel(gasInSui: number): GasLevel {
  if (gasInSui < 0.01) return 'low'
  if (gasInSui < 0.1) return 'normal'
  return 'high'
}

export function getGasDescription(gasInSui: number): string {
  const level = getGasLevel(gasInSui)
  switch (level) {
    case 'low':
      return 'Typical for simple transfers'
    case 'normal':
      return 'Normal for contract interactions'
    case 'high':
      return 'Higher than average - complex operation'
  }
}

export function getGasColor(gasInSui: number): string {
  const level = getGasLevel(gasInSui)
  switch (level) {
    case 'low':
      return '#22C55E' // green
    case 'normal':
      return '#F59E0B' // yellow
    case 'high':
      return '#EF4444' // red
  }
}
