import type { Node, Edge } from '@vue-flow/core'
import type { TransactionData, ObjectChange } from './useSuiClient'

export type FlowNodeType = 'sender' | 'function' | 'object' | 'recipient' | 'event' | 'gas'

export interface FlowNodeData {
  label: string
  type: FlowNodeType
  sublabel?: string
  icon?: string
  color?: string
  amount?: string
  direction?: 'in' | 'out'
  objectId?: string
  objectType?: string
  eventType?: string
  gasAmount?: string // For gas level calculation
}

// Better layout - horizontal flow with grouped columns
const LAYOUT = {
  startX: 60,
  startY: 60,
  nodeWidth: 140,
  nodeHeight: 60,
  columnGap: 240, // Horizontal gap between columns (increased)
  rowGap: 100, // Vertical gap between rows in same column (increased)
  maxPerColumn: 4 // Max nodes per column before creating new column
}

function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}

function formatObjectType(type: string): string {
  const match = type.match(/::([^:]+)(?:<|$)/)
  if (match?.[1]) return match[1]
  const parts = type.split('::')
  return parts[parts.length - 1] || type
}

function truncateFunctionName(name: string, maxLen = 25): string {
  if (name.length <= maxLen) return name
  // Try to show module::function but truncated
  const parts = name.split('::')
  if (parts.length >= 2) {
    const fn = parts[parts.length - 1]
    if (fn && fn.length > maxLen - 3) {
      return fn.slice(0, maxLen - 3) + '...'
    }
    return name.slice(0, maxLen - 3) + '...'
  }
  return name.slice(0, maxLen - 3) + '...'
}

function getObjectIcon(type: string): string {
  const typeLower = type.toLowerCase()
  if (typeLower.includes('coin')) return '💰'
  if (typeLower.includes('nft') || typeLower.includes('suifren') || typeLower.includes('capy')) return '🖼️'
  if (typeLower.includes('stake')) return '🔒'
  if (typeLower.includes('position')) return '📊'
  if (typeLower.includes('pool')) return '🏊'
  if (typeLower.includes('field')) return '📋'
  return '📦'
}

export function useTransactionFlow() {
  const nodes = ref<Node<FlowNodeData>[]>([])
  const edges = ref<Edge[]>([])

  function generateFlow(tx: TransactionData | null) {
    if (!tx) {
      nodes.value = []
      edges.value = []
      return
    }

    const newNodes: Node<FlowNodeData>[] = []
    const newEdges: Edge[] = []
    let nodeId = 0

    // Column positions
    let col = 0

    // === COLUMN 0: Sender ===
    const senderX = LAYOUT.startX + col * LAYOUT.columnGap
    const senderId = `node-${nodeId++}`
    newNodes.push({
      id: senderId,
      type: 'sender',
      position: { x: senderX, y: LAYOUT.startY + 150 }, // Center vertically
      data: {
        label: truncateAddress(tx.sender),
        type: 'sender',
        sublabel: 'Sender',
        icon: '👤',
        color: '#4DA2FF'
      }
    })
    col++

    // === COLUMN 1: Function Call ===
    let functionNodeId: string | null = null
    if (tx.functionCalled) {
      const funcX = LAYOUT.startX + col * LAYOUT.columnGap
      functionNodeId = `node-${nodeId++}`
      newNodes.push({
        id: functionNodeId,
        type: 'function',
        position: { x: funcX, y: LAYOUT.startY + 150 },
        data: {
          label: truncateFunctionName(tx.functionCalled),
          type: 'function',
          sublabel: 'Function',
          icon: '⚡',
          color: '#F59E0B',
          objectType: tx.functionCalled // Store full name for tooltip
        }
      })

      newEdges.push({
        id: `edge-sender-function`,
        source: senderId,
        target: functionNodeId,
        animated: true,
        style: { stroke: '#4DA2FF', strokeWidth: 2 }
      })
      col++
    }

    // === COLUMN 2+: Objects by Type ===
    // Group objects: Created first, then Mutated (skip transferred for now - handle with recipients)
    const createdObjects = tx.objectChanges.created
    const mutatedObjects = tx.objectChanges.mutated
    const transferredObjects = tx.objectChanges.transferred

    // Helper to add object nodes in a column
    function addObjectColumn(
      objects: ObjectChange[],
      changeType: string,
      color: string,
      colIndex: number
    ): string[] {
      const ids: string[] = []
      const x = LAYOUT.startX + colIndex * LAYOUT.columnGap

      // Calculate vertical centering
      const totalHeight = (objects.length - 1) * LAYOUT.rowGap
      const startY = LAYOUT.startY + 150 - totalHeight / 2

      objects.slice(0, 6).forEach((obj, i) => { // Limit to 6 per type
        const objId = `node-${nodeId++}`
        ids.push(objId)

        newNodes.push({
          id: objId,
          type: 'object',
          position: { x, y: startY + i * LAYOUT.rowGap },
          data: {
            label: formatObjectType(obj.objectType),
            type: 'object',
            sublabel: changeType,
            icon: getObjectIcon(obj.objectType),
            color,
            objectId: obj.objectId,
            objectType: obj.objectType
          }
        })

        // Connect from function (or sender)
        const sourceId = functionNodeId || senderId
        newEdges.push({
          id: `edge-to-${objId}`,
          source: sourceId,
          target: objId,
          animated: true,
          style: { stroke: color, strokeWidth: 2 }
        })
      })

      return ids
    }

    const createdIds: string[] = []
    const mutatedIds: string[] = []

    // Add created objects
    if (createdObjects.length > 0) {
      createdIds.push(...addObjectColumn(createdObjects, 'Created', '#22C55E', col))
      col++
    }

    // Add mutated objects
    if (mutatedObjects.length > 0) {
      mutatedIds.push(...addObjectColumn(mutatedObjects, 'Mutated', '#F59E0B', col))
      col++
    }

    // === FINAL COLUMN: Recipients + Gas ===
    const recipientX = LAYOUT.startX + col * LAYOUT.columnGap

    // Balance changes (recipients)
    const uniqueRecipients = new Map<string, { amount: bigint, formatted: string }>()
    tx.balanceChanges.forEach((bc) => {
      const existing = uniqueRecipients.get(bc.owner)
      if (existing) {
        existing.amount += bc.amount
        existing.formatted = bc.amountFormatted // Use latest format
      } else {
        uniqueRecipients.set(bc.owner, { amount: bc.amount, formatted: bc.amountFormatted })
      }
    })

    const recipients = Array.from(uniqueRecipients.entries())
    const recipientStartY = LAYOUT.startY + 50

    recipients.slice(0, 3).forEach(([owner, data], i) => { // Limit to 3 recipients
      const recipientId = `node-${nodeId++}`
      const isGain = data.amount > 0n

      newNodes.push({
        id: recipientId,
        type: 'recipient',
        position: { x: recipientX, y: recipientStartY + i * LAYOUT.rowGap },
        data: {
          label: truncateAddress(owner),
          type: 'recipient',
          sublabel: isGain ? 'Received' : 'Sent',
          icon: isGain ? '📥' : '📤',
          color: isGain ? '#22C55E' : '#EF4444',
          amount: data.formatted,
          direction: isGain ? 'in' : 'out'
        }
      })

      // Connect from the rightmost object column
      const sourceIds = mutatedIds.length > 0 ? mutatedIds : createdIds.length > 0 ? createdIds : [functionNodeId || senderId]
      const sourceId = sourceIds[0] || senderId
      newEdges.push({
        id: `edge-to-recipient-${i}`,
        source: sourceId,
        target: recipientId,
        animated: true,
        style: { stroke: isGain ? '#22C55E' : '#EF4444', strokeWidth: 2 }
      })
    })

    // Gas node (bottom right)
    const gasNodeId = `node-${nodeId++}`
    const gasY = recipients.length > 0
      ? recipientStartY + recipients.slice(0, 3).length * LAYOUT.rowGap + 40
      : LAYOUT.startY + 250

    newNodes.push({
      id: gasNodeId,
      type: 'gas',
      position: { x: recipientX, y: gasY },
      data: {
        label: `${tx.gasInSui.toFixed(4)} SUI`,
        type: 'gas',
        sublabel: 'Gas Used',
        icon: '⛽',
        color: '#6B7280',
        gasAmount: tx.gasInSui.toFixed(6) // For gas level calculation
      }
    })

    // Connect sender to gas (dashed line - improved contrast)
    newEdges.push({
      id: `edge-sender-gas`,
      source: senderId,
      target: gasNodeId,
      animated: false,
      style: { stroke: '#9CA3AF', strokeWidth: 1.5, strokeDasharray: '6,4' }
    })

    nodes.value = newNodes
    edges.value = newEdges
  }

  return {
    nodes,
    edges,
    generateFlow
  }
}
