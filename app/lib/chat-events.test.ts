import { describe, it, expect } from 'vitest'
import { describeEvent } from './chat-events'

describe('describeEvent', () => {
  it('marks a yellow card distinctly', () => {
    const out = describeEvent({
      incident: 'FootballYellowCard',
      text: 'HOME: Luis Alberto Pavez (Yellow card)',
      time: "90 + 6'",
    })
    expect(out).toContain('🟨')
    expect(out).not.toContain('🟥')
  })

  it('marks a red card distinctly, different from yellow', () => {
    const out = describeEvent({
      incident: 'FootballRedCard',
      text: 'HOME: Bastian Yanez (Red card)',
      time: "8'",
    })
    expect(out).toContain('🟥')
    expect(out).not.toContain('🟨')
  })

  it('still marks goals with the existing emoji (regression)', () => {
    const out = describeEvent({
      incident: 'FootballGoal',
      text: 'AWAY: Gonzalo Tapia (Goal)',
      time: "90 + 4'",
    })
    expect(out).toContain('⚽')
  })

  it('still marks substitutions with the existing emoji (regression)', () => {
    const out = describeEvent({ incident: 'FootballSub', text: 'Player X replaces Player Y', time: "60'" })
    expect(out).toContain('🔁')
  })

  it('passes through unknown incidents unchanged aside from the time prefix', () => {
    const out = describeEvent({ incident: 'FootballVAR', text: 'VAR review', time: "50'" })
    expect(out).toBe("50' VAR review")
  })

  it('returns null when there is no text', () => {
    expect(describeEvent({ incident: 'FootballYellowCard', text: '' })).toBeNull()
    expect(describeEvent({ incident: 'FootballYellowCard' })).toBeNull()
  })
})
