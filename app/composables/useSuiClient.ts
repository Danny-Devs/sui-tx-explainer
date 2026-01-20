import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import type { SuiTransactionBlockResponse } from '@mysten/sui/client'

export type Network = 'mainnet' | 'testnet' | 'devnet'

export interface TransactionData {
  digest: string
  sender: string
  status: 'success' | 'failure'
  error?: string
  timestamp: Date | null
  gasUsed: {
    total: bigint
    computation: bigint
    storage: bigint
    rebate: bigint
  }
  gasInSui: number
  objectChanges: {
    created: ObjectChange[]
    mutated: ObjectChange[]
    deleted: ObjectChange[]
    transferred: ObjectChange[]
  }
  balanceChanges: BalanceChange[]
  events: SuiEvent[]
  functionCalled?: string
  raw: SuiTransactionBlockResponse
}

export interface ObjectChange {
  objectId: string
  objectType: string
  owner?: string
}

export interface BalanceChange {
  owner: string
  coinType: string
  amount: bigint
  amountFormatted: string
}

export interface SuiEvent {
  type: string
  parsedJson?: Record<string, unknown>
}

const clients = new Map<Network, SuiClient>()

function getClient(network: Network): SuiClient {
  if (!clients.has(network)) {
    clients.set(network, new SuiClient({ url: getFullnodeUrl(network) }))
  }
  return clients.get(network)!
}

function formatAmount(amount: bigint, coinType: string): string {
  // SUI has 9 decimals
  const decimals = coinType.includes('sui::SUI') ? 9 : 6
  const value = Number(amount) / Math.pow(10, decimals)
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

// Extract address from Sui owner object (can be AddressOwner, ObjectOwner, or Shared)
function extractOwnerAddress(owner: unknown): string {
  if (typeof owner === 'string') return owner
  if (owner && typeof owner === 'object') {
    const o = owner as Record<string, unknown>
    if ('AddressOwner' in o && typeof o.AddressOwner === 'string') return o.AddressOwner
    if ('ObjectOwner' in o && typeof o.ObjectOwner === 'string') return o.ObjectOwner
    if ('Shared' in o) return 'Shared'
    if ('Immutable' in o) return 'Immutable'
  }
  return 'Unknown'
}

export function useSuiClient() {
  const network = ref<Network>('mainnet')
  const loading = ref(false)
  const error = ref<string | null>(null)
  const transaction = ref<TransactionData | null>(null)

  async function fetchTransaction(digest: string): Promise<TransactionData | null> {
    loading.value = true
    error.value = null
    transaction.value = null

    try {
      // Clean up digest - handle Suiscan URLs
      let cleanDigest = digest.trim()
      if (cleanDigest.includes('suiscan.xyz')) {
        const match = cleanDigest.match(/txblock\/([A-Za-z0-9]+)/)
        if (match?.[1]) cleanDigest = match[1]
      }
      if (cleanDigest.includes('suivision.xyz')) {
        const match = cleanDigest.match(/txblock\/([A-Za-z0-9]+)/)
        if (match?.[1]) cleanDigest = match[1]
      }

      const client = getClient(network.value)
      const response = await client.getTransactionBlock({
        digest: cleanDigest,
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true
        }
      })

      // Parse gas used
      const gasUsed = response.effects?.gasUsed
      const computation = BigInt(gasUsed?.computationCost || '0')
      const storage = BigInt(gasUsed?.storageCost || '0')
      const rebate = BigInt(gasUsed?.storageRebate || '0')
      const total = computation + storage - rebate

      // Parse object changes
      const objectChanges = {
        created: [] as ObjectChange[],
        mutated: [] as ObjectChange[],
        deleted: [] as ObjectChange[],
        transferred: [] as ObjectChange[]
      }

      for (const change of response.objectChanges || []) {
        if (change.type === 'created') {
          objectChanges.created.push({
            objectId: change.objectId,
            objectType: change.objectType,
            owner: 'owner' in change ? extractOwnerAddress(change.owner) : undefined
          })
        } else if (change.type === 'mutated') {
          objectChanges.mutated.push({
            objectId: change.objectId,
            objectType: change.objectType,
            owner: 'owner' in change ? extractOwnerAddress(change.owner) : undefined
          })
        } else if (change.type === 'deleted') {
          objectChanges.deleted.push({
            objectId: change.objectId,
            objectType: change.objectType
          })
        } else if (change.type === 'transferred') {
          objectChanges.transferred.push({
            objectId: change.objectId,
            objectType: change.objectType,
            owner: 'recipient' in change ? extractOwnerAddress(change.recipient) : undefined
          })
        }
      }

      // Parse balance changes
      const balanceChanges: BalanceChange[] = (response.balanceChanges || []).map((bc) => {
        const amount = BigInt(bc.amount)
        return {
          owner: 'owner' in bc ? extractOwnerAddress(bc.owner) : 'Unknown',
          coinType: bc.coinType,
          amount,
          amountFormatted: formatAmount(amount, bc.coinType)
        }
      })

      // Parse events
      const events: SuiEvent[] = (response.events || []).map(e => ({
        type: e.type,
        parsedJson: e.parsedJson as Record<string, unknown>
      }))

      // Get function called (if any)
      let functionCalled: string | undefined
      const txData = response.transaction?.data?.transaction
      if (txData && 'kind' in txData && txData.kind === 'ProgrammableTransaction') {
        const ptb = txData as { transactions?: Array<{ MoveCall?: { package: string, module: string, function: string } }> }
        const moveCall = ptb.transactions?.find(t => t.MoveCall)?.MoveCall
        if (moveCall) {
          functionCalled = `${moveCall.module}::${moveCall.function}`
        }
      }

      const data: TransactionData = {
        digest: cleanDigest,
        sender: response.transaction?.data?.sender || 'Unknown',
        status: response.effects?.status?.status === 'success' ? 'success' : 'failure',
        error: response.effects?.status?.error,
        timestamp: response.timestampMs ? new Date(parseInt(response.timestampMs)) : null,
        gasUsed: { total, computation, storage, rebate },
        gasInSui: Number(total) / 1_000_000_000,
        objectChanges,
        balanceChanges,
        events,
        functionCalled,
        raw: response
      }

      transaction.value = data
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch transaction'
      return null
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    network,
    loading,
    error,
    transaction,
    fetchTransaction,
    clearError
  }
}
