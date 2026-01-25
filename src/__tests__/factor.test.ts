import { describe, it, expect } from 'vitest'
import FACTOR from '../factor'

describe('factor.ts', () => {
  describe('FACTOR constant', () => {
    it('should contain entries for all ship types', () => {
      // FACTOR should be defined
      expect(FACTOR).toBeDefined()
      // Check that it has expected ship type entries
      expect(Object.keys(FACTOR).length).toBeGreaterThan(0)
    })

    it('should have correct structure for each entry', () => {
      for (const [key, value] of Object.entries(FACTOR)) {
        expect(value).toHaveProperty('api_id')
        expect(value).toHaveProperty('api_name')
        expect(value).toHaveProperty('factor')
        expect(typeof value.api_id).toBe('number')
        expect(typeof value.api_name).toBe('string')
        expect(typeof value.factor).toBe('number')
        expect(value.api_id).toBe(Number(key))
      }
    })

    it('should have destroyer (駆逐艦) with factor 1', () => {
      expect(FACTOR[2]).toEqual({
        api_id: 2,
        api_name: '駆逐艦',
        factor: 1,
      })
    })

    it('should have escort (海防艦) with factor 0.5', () => {
      expect(FACTOR[1]).toEqual({
        api_id: 1,
        api_name: '海防艦',
        factor: 0.5,
      })
    })

    it('should have super dreadnought with factor 0', () => {
      expect(FACTOR[12]).toEqual({
        api_id: 12,
        api_name: '超弩級戦艦',
        factor: 0,
      })
    })

    it('should have carrier (正規空母) with factor 2', () => {
      expect(FACTOR[11]).toEqual({
        api_id: 11,
        api_name: '正規空母',
        factor: 2,
      })
    })

    it('should have training cruiser (練習巡洋艦) with factor 1', () => {
      expect(FACTOR[21]).toEqual({
        api_id: 21,
        api_name: '練習巡洋艦',
        factor: 1,
      })
    })

    it('should have all 22 ship types', () => {
      expect(Object.keys(FACTOR).length).toBe(22)
    })

    it('should have all factors be non-negative', () => {
      for (const value of Object.values(FACTOR)) {
        expect(value.factor).toBeGreaterThanOrEqual(0)
      }
    })
  })
})
