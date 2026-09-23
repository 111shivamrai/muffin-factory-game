/**
 * Muffin Factory Game — Game Lifecycle Tracker
 * 
 * Provides reliable, non-intrusive lifecycle tracking across:
 * 1. LICENSE_CREATED: Instructor license created in Admin dashboard / system
 * 2. GAME_STARTED: Room created with code and waiting for cohorts
 * 3. TEAM_JOINED: Team cohort registered and connected
 * 4. SIMULATION_RUNNING: Simulation actively ticking days
 * 5. GAME_COMPLETED: Team simulation finished (max days reached, room finished, or bankrupt)
 * 
 * Sourced 100% from existing Room, TeamState, and User state without duplicating data.
 */

import { Room, TeamState } from '../../../backend/src/types/index.js';

export type GameLifecycleState =
  | 'LICENSE_CREATED'
  | 'GAME_STARTED'
  | 'TEAM_JOINED'
  | 'SIMULATION_RUNNING'
  | 'GAME_COMPLETED';

export type CompletionReason =
  | 'MAX_DAYS_REACHED'
  | 'INSTRUCTOR_FINISHED'
  | 'FACTORY_BANKRUPT'
  | 'NONE';

/**
 * Derives the active lifecycle stage from the single source of truth.
 */
export function getGameLifecycleState(
  room: Room | null,
  teamState: TeamState | null,
  user: any | null
): GameLifecycleState {
  if (isTeamSimulationCompleted(room, teamState)) {
    return 'GAME_COMPLETED';
  }

  if (room && room.status === 'active') {
    return 'SIMULATION_RUNNING';
  }

  if (teamState && room) {
    return 'TEAM_JOINED';
  }

  if (room) {
    return 'GAME_STARTED';
  }

  // When instructor/admin is logged in or user has a license
  if (user && (user.role === 'instructor' || user.role === 'admin')) {
    return 'LICENSE_CREATED';
  }

  return 'GAME_STARTED';
}

/**
 * Reliably detects if the team's simulation is genuinely finished
 * according to existing game rules.
 * 
 * Supports individual team completion (e.g. bankruptcy) or session completion (max days).
 */
export function isTeamSimulationCompleted(
  room: Room | null,
  teamState: TeamState | null
): boolean {
  if (!room && !teamState) return false;

  // 1. Team specific bankruptcy completion
  if (teamState && teamState.status === 'bankrupt') {
    return true;
  }

  // 2. Room max days reached
  if (room) {
    if (room.status === 'finished') {
      return true;
    }
    if (room.maxDays > 0 && room.currentDay >= room.maxDays) {
      return true;
    }
  }

  return false;
}

/**
 * Returns human-readable completion reason.
 */
export function getCompletionReason(
  room: Room | null,
  teamState: TeamState | null
): CompletionReason {
  if (teamState && teamState.status === 'bankrupt') {
    return 'FACTORY_BANKRUPT';
  }
  if (room && room.status === 'finished') {
    return 'INSTRUCTOR_FINISHED';
  }
  if (room && room.maxDays > 0 && room.currentDay >= room.maxDays) {
    return 'MAX_DAYS_REACHED';
  }
  return 'NONE';
}
