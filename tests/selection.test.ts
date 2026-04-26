import { describe, expect, it } from 'vitest'
import { buildSyllabusIndex, emptySelection, normalizeSelection, selectAllUnits, toggleSelectionNode } from '../src/lib/selection'
import type { SyllabusNode } from '../src/types'

const nodes: SyllabusNode[] = [
  { id: 'A', label: 'A', depth: 0, kind: 'umbrella', parentId: null, childIds: ['A1', 'A2'], canonicalOrder: 0 },
  { id: 'A1', label: 'A.1', depth: 1, kind: 'subunit', parentId: 'A', childIds: [], canonicalOrder: 1 },
  { id: 'A2', label: 'A.2', depth: 1, kind: 'subunit', parentId: 'A', childIds: [], canonicalOrder: 2 },
  { id: 'B', label: 'B', depth: 0, kind: 'umbrella', parentId: null, childIds: ['B1'], canonicalOrder: 3 },
  { id: 'B1', label: 'B.1', depth: 1, kind: 'subunit', parentId: 'B', childIds: [], canonicalOrder: 4 },
]

describe('selection normalization', () => {
  const index = buildSyllabusIndex(nodes)

  it('collapses full subunit coverage into umbrella selection', () => {
    const next = normalizeSelection(
      {
        umbrellaIds: [],
        subunitIds: ['A1', 'A2'],
      },
      index,
    )

    expect(next).toEqual({
      umbrellaIds: ['A'],
      subunitIds: [],
    })
  })

  it('clears subunits when umbrella is toggled on', () => {
    let selection = toggleSelectionNode(emptySelection(), index, 'A1')
    selection = toggleSelectionNode(selection, index, 'A')

    expect(selection).toEqual({
      umbrellaIds: ['A'],
      subunitIds: [],
    })
  })

  it('supports mixed branches', () => {
    let selection = toggleSelectionNode(emptySelection(), index, 'A1')
    selection = toggleSelectionNode(selection, index, 'B')

    expect(selection).toEqual({
      umbrellaIds: ['B'],
      subunitIds: ['A1'],
    })
  })

  it('select all chooses root umbrellas', () => {
    expect(selectAllUnits(index)).toEqual({
      umbrellaIds: ['A', 'B'],
      subunitIds: [],
    })
  })
})
