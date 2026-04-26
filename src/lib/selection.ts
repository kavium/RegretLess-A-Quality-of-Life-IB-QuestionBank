import type { NormalizedSelection, SyllabusNode } from '../types'

export interface SyllabusIndex {
  nodeMap: Map<string, SyllabusNode>
  descendantsMap: Map<string, string[]>
  rootIds: string[]
  orderedIds: string[]
}

export function buildSyllabusIndex(nodes: SyllabusNode[]): SyllabusIndex {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const orderedIds = [...nodes].sort((left, right) => left.canonicalOrder - right.canonicalOrder).map((node) => node.id)
  const rootIds = nodes.filter((node) => node.parentId === null).sort((left, right) => left.canonicalOrder - right.canonicalOrder).map((node) => node.id)
  const descendantsMap = new Map<string, string[]>()

  function getLeafDescendants(nodeId: string): string[] {
    const cached = descendantsMap.get(nodeId)

    if (cached) {
      return cached
    }

    const node = nodeMap.get(nodeId)

    if (!node) {
      return []
    }

    if (!node.childIds.length) {
      descendantsMap.set(nodeId, [nodeId])
      return [nodeId]
    }

    const descendants = node.childIds.flatMap((childId) => getLeafDescendants(childId))
    descendantsMap.set(nodeId, descendants)
    return descendants
  }

  orderedIds.forEach((nodeId) => {
    getLeafDescendants(nodeId)
  })

  return {
    nodeMap,
    descendantsMap,
    rootIds,
    orderedIds,
  }
}

export function emptySelection(): NormalizedSelection {
  return {
    umbrellaIds: [],
    subunitIds: [],
  }
}

export function normalizeSelection(selection: NormalizedSelection, index: SyllabusIndex): NormalizedSelection {
  const umbrellaIds = new Set(
    selection.umbrellaIds.filter((id) => {
      const node = index.nodeMap.get(id)
      return node?.kind === 'umbrella'
    }),
  )
  const subunitIds = new Set(
    selection.subunitIds.filter((id) => {
      const node = index.nodeMap.get(id)
      return node?.kind === 'subunit'
    }),
  )

  for (const umbrellaId of umbrellaIds) {
    const descendants = index.descendantsMap.get(umbrellaId) ?? []
    descendants.forEach((id) => subunitIds.delete(id))
  }

  for (const nodeId of index.orderedIds) {
    const node = index.nodeMap.get(nodeId)

    if (!node || node.kind !== 'umbrella') {
      continue
    }

    const descendants = index.descendantsMap.get(nodeId) ?? []

    if (descendants.length > 0 && descendants.every((id) => subunitIds.has(id))) {
      descendants.forEach((id) => subunitIds.delete(id))
      umbrellaIds.add(nodeId)
    }
  }

  return {
    umbrellaIds: sortSelectionIds([...umbrellaIds], index),
    subunitIds: sortSelectionIds([...subunitIds], index),
  }
}

function sortSelectionIds(ids: string[], index: SyllabusIndex) {
  return ids.sort((left, right) => {
    const leftOrder = index.nodeMap.get(left)?.canonicalOrder ?? 0
    const rightOrder = index.nodeMap.get(right)?.canonicalOrder ?? 0
    return leftOrder - rightOrder
  })
}

export function toggleSelectionNode(
  selection: NormalizedSelection,
  index: SyllabusIndex,
  nodeId: string,
): NormalizedSelection {
  const node = index.nodeMap.get(nodeId)

  if (!node) {
    return selection
  }

  const nextSelection: NormalizedSelection = {
    umbrellaIds: [...selection.umbrellaIds],
    subunitIds: [...selection.subunitIds],
  }

  if (node.kind === 'umbrella') {
    const umbrellaIds = new Set(nextSelection.umbrellaIds)

    if (umbrellaIds.has(nodeId)) {
      umbrellaIds.delete(nodeId)
    } else {
      umbrellaIds.add(nodeId)
      const descendants = index.descendantsMap.get(nodeId) ?? []
      nextSelection.subunitIds = nextSelection.subunitIds.filter((id) => !descendants.includes(id))
    }

    nextSelection.umbrellaIds = [...umbrellaIds]
    return normalizeSelection(nextSelection, index)
  }

  const subunitIds = new Set(nextSelection.subunitIds)

  if (subunitIds.has(nodeId)) {
    subunitIds.delete(nodeId)
  } else {
    subunitIds.add(nodeId)
  }

  nextSelection.subunitIds = [...subunitIds]
  return normalizeSelection(nextSelection, index)
}

export function selectAllUnits(index: SyllabusIndex): NormalizedSelection {
  const selection: NormalizedSelection = {
    umbrellaIds: [],
    subunitIds: [],
  }

  for (const nodeId of index.rootIds) {
    const node = index.nodeMap.get(nodeId)

    if (!node) {
      continue
    }

    if (node.kind === 'umbrella') {
      selection.umbrellaIds.push(nodeId)
    } else {
      selection.subunitIds.push(nodeId)
    }
  }

  return normalizeSelection(selection, index)
}

export function isNodeSelected(selection: NormalizedSelection, nodeId: string) {
  return selection.umbrellaIds.includes(nodeId) || selection.subunitIds.includes(nodeId)
}

export function getNodeSelectionState(selection: NormalizedSelection, index: SyllabusIndex, nodeId: string) {
  const node = index.nodeMap.get(nodeId)

  if (!node) {
    return {
      checked: false,
      partial: false,
    }
  }

  if (node.kind === 'subunit') {
    return {
      checked: selection.subunitIds.includes(nodeId),
      partial: false,
    }
  }

  const checked = selection.umbrellaIds.includes(nodeId)
  const descendants = index.descendantsMap.get(nodeId) ?? []
  const selectedDescendantCount = descendants.filter((id) => selection.subunitIds.includes(id)).length

  return {
    checked,
    partial: !checked && selectedDescendantCount > 0,
  }
}

export function getSelectionLabels(selection: NormalizedSelection, index: SyllabusIndex) {
  return [...selection.umbrellaIds, ...selection.subunitIds]
    .map((nodeId) => index.nodeMap.get(nodeId))
    .filter((node): node is SyllabusNode => Boolean(node))
    .sort((left, right) => left.canonicalOrder - right.canonicalOrder)
    .map((node) => node.label)
}
