import { describe, expect, it } from 'vitest'
import {
  commit,
  hasPendingOperation,
  keypadState,
  press,
  reset,
  type KeypadKey,
  type KeypadState,
} from '../keypadEngine'
import { fromMajor } from '../money'

const digit = (n: number): KeypadKey => ({ type: 'digit', digit: n })
const doubleZero: KeypadKey = { type: 'doubleZero' }
const del: KeypadKey = { type: 'delete' }
const add: KeypadKey = { type: 'add' }
const subtract: KeypadKey = { type: 'subtract' }
const equals: KeypadKey = { type: 'equals' }

function type(keys: KeypadKey[], startingAt = 0): KeypadState {
  return keys.reduce((state, key) => press(state, key), keypadState(startingAt))
}

describe('keypadEngine', () => {
  it('fills digits in from the right', () => {
    expect(type([digit(1), digit(2), digit(3)]).value).toBe(fromMajor(1.23))
  })

  it('first digit replaces the incoming balance', () => {
    expect(type([digit(5)], fromMajor(40)).value).toBe(fromMajor(0.05))
  })

  it('handles double zero', () => {
    expect(type([digit(2), doubleZero, digit(0)]).value).toBe(fromMajor(20))
  })

  it('delete removes the last digit', () => {
    expect(type([digit(1), digit(2), digit(3), del]).value).toBe(fromMajor(0.12))
  })

  it('delete on an untouched balance clears it', () => {
    expect(type([del], fromMajor(40)).value).toBe(0)
  })

  it('adds to an existing balance', () => {
    let state = press(keypadState(fromMajor(40)), add)
    expect(hasPendingOperation(state)).toBe(true)
    expect(state.value).toBe(0)

    state = type([digit(1), digit(0), doubleZero]).value === fromMajor(10) ? state : state
    state = press(state, digit(1))
    state = press(state, digit(0))
    state = press(state, doubleZero)
    expect(state.value).toBe(fromMajor(10))

    state = press(state, equals)
    expect(state.value).toBe(fromMajor(50))
    expect(hasPendingOperation(state)).toBe(false)
  })

  it('subtracting can go negative', () => {
    const state = type([subtract, digit(2), digit(0), doubleZero, equals], fromMajor(10))
    expect(state.value).toBe(fromMajor(-10))
  })

  it('chaining operators resolves the earlier one', () => {
    const state = type([add, digit(5), digit(0), doubleZero, add], fromMajor(10))
    // The first + is settled the moment the second is pressed.
    expect(state.pendingValue).toBe(fromMajor(60))
  })

  it('suggested replaces the value and clears any pending math', () => {
    let state = press(keypadState(fromMajor(10)), add)
    state = press(state, { type: 'suggested' }, fromMajor(87.5))
    expect(state.value).toBe(fromMajor(87.5))
    expect(hasPendingOperation(state)).toBe(false)
  })

  it('empty zeroes the envelope', () => {
    expect(press(keypadState(fromMajor(240)), { type: 'empty' }).value).toBe(0)
  })

  it('commit resolves a half-finished expression', () => {
    const state = type([add, digit(1), digit(0), doubleZero], fromMajor(40))
    expect(commit(state).value).toBe(fromMajor(50))
  })

  it('reset clears everything for the next envelope', () => {
    type([add, digit(9)], fromMajor(40))
    const state = reset(fromMajor(12))
    expect(state.value).toBe(fromMajor(12))
    expect(hasPendingOperation(state)).toBe(false)
    expect(state.isTyping).toBe(false)
  })

  it('caps entry', () => {
    let state = keypadState()
    for (let i = 0; i < 20; i += 1) state = press(state, digit(9))
    expect(state.value).toBeLessThanOrEqual(99_999_999_99)
  })
})
