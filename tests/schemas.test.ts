import { describe, expect, it } from 'vitest'
import {
  SubjectIdSchema,
  SubjectManifestSchema,
  SubjectBundleSchema,
  QuestionRecordSchema,
  QuestionDetailSchema,
} from '../src/lib/schemas'

describe('SubjectIdSchema', () => {
  it('accepts safe subject ids', () => {
    expect(SubjectIdSchema.parse('46-dp-physics-last-assessment-2024')).toBe('46-dp-physics-last-assessment-2024')
  })

  it('rejects path-traversal attempts', () => {
    expect(() => SubjectIdSchema.parse('../etc/passwd')).toThrow()
    expect(() => SubjectIdSchema.parse('46/with/slash')).toThrow()
  })

  it('rejects reserved prototype-polluting keys', () => {
    expect(() => SubjectIdSchema.parse('__proto__')).toThrow()
  })
})

describe('QuestionRecordSchema', () => {
  it('normalises AHL to HL via transform', () => {
    const record = QuestionRecordSchema.parse({
      questionId: 'q1',
      referenceCode: '19M.1.AHL.TZ1.H_11a.i',
      subjectId: 'math',
      title: 'Q',
      paper: '1',
      level: 'AHL',
      questionNumber: 'a.i',
      marksAvailable: '[2]',
      breadcrumbLabels: ['Topic 1'],
      memberSectionIds: [],
      sectionOrders: {},
    })
    expect(record.level).toBe('HL')
  })

  it('rejects unknown paper code', () => {
    expect(() =>
      QuestionRecordSchema.parse({
        questionId: 'q1',
        referenceCode: 'X',
        subjectId: 's',
        title: 't',
        paper: '99',
        level: 'HL',
        questionNumber: '',
        marksAvailable: '',
        breadcrumbLabels: [],
        memberSectionIds: [],
        sectionOrders: {},
      }),
    ).toThrow()
  })
})

describe('SubjectBundleSchema', () => {
  it('rejects bundles with missing required fields', () => {
    expect(() => SubjectBundleSchema.parse({ subject: { id: 'x', name: 'X' } })).toThrow()
  })

  it('parses minimal valid bundle', () => {
    const parsed = SubjectBundleSchema.parse({
      subject: { id: 'math', name: 'Math' },
      syllabus: [],
      sectionQuestionOrder: {},
      questions: [],
    })
    expect(parsed.subject.id).toBe('math')
  })
})

describe('SubjectManifestSchema', () => {
  it('rejects entries with non-numeric questionCount', () => {
    expect(() =>
      SubjectManifestSchema.parse({
        version: '2026-01-01',
        generatedAt: '2026-01-01',
        subjects: [
          {
            id: 'math',
            name: 'Math',
            bundleUrl: '/data/subjects/math/index-0123456789abcdef0123456789abcdef01234567.json',
            bundleHash: 'abc',
            questionCount: 'lots',
            nodeCount: 0,
          },
        ],
      }),
    ).toThrow()
  })

  it('rejects bundle URLs that do not stay under the subject path', () => {
    expect(() =>
      SubjectManifestSchema.parse({
        version: '2026-01-01T00:00:00.000Z',
        generatedAt: '2026-01-01T00:00:00.000Z',
        subjects: [
          {
            id: 'math',
            name: 'Math',
            bundleUrl: '/data/subjects/physics/index-0123456789abcdef0123456789abcdef01234567.json',
            bundleHash: '0123456789abcdef0123456789abcdef01234567',
            questionCount: 1,
            nodeCount: 1,
          },
        ],
      }),
    ).toThrow()
  })
})

describe('QuestionDetailSchema', () => {
  it('strips unknown keys (so scraper-only fields like schemaVersion are tolerated)', () => {
    const parsed = QuestionDetailSchema.parse({
      questionId: 'q1',
      questionHtml: '<p>x</p>',
      markschemeHtml: '<p>y</p>',
      schemaVersion: 2,
      meta: { foo: 'bar' },
    })
    expect(parsed).toEqual({ questionId: 'q1', questionHtml: '<p>x</p>', markschemeHtml: '<p>y</p>' })
  })
})
