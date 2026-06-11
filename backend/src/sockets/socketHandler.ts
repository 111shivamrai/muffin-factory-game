import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { db } from '../db/db.js';
import { runSimDay, getDemandForDay, DEFAULT_MACHINE_CONFIGS } from '../simulation/engine.js';
import { TeamState, Room, SavedScenario, MachineType, MaterialType, MachineOrder } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_muffin_mega_factory_2026';

// Active timers cache
const activeTimers: Record<string, NodeJS.Timeout> = {};

// Helper to decode socket handshake token
function verifySocketToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Helper to initialize a default team state
function createInitialTeamState(teamId: string, teamName: string, controllerId: string, scenario: SavedScenario): TeamState {
  const mConfigs = scenario.machineSettings;
  const initialMixers = 1;
  const initialBakers = 1;
  const initialIcers = 1;
  const initialPackagers = 1;

  const defaultMachines = {
    mixing: { type: 'mixing' as MachineType, count: initialMixers, active: initialMixers, inTransit: 0 },
    baking: { type: 'baking' as MachineType, count: initialBakers, active: initialBakers, inTransit: 0 },
    icing: { type: 'icing' as MachineType, count: initialIcers, active: initialIcers, inTransit: 0 },
    packaging: { type: 'packaging' as MachineType, count: initialPackagers, active: initialPackagers, inTransit: 0 }
  };

  const defaultInventory = {
    base_mix: { materialType: 'base_mix' as MaterialType, onHand: 1000, inTransit: 0, orderQty: 1000, reorderPoint: 300, safetyStock: 200 },
    packaging_material: { materialType: 'packaging_material' as MaterialType, onHand: 800, inTransit: 0, orderQty: 1000, reorderPoint: 200, safetyStock: 100 },
    finished_muffin: { materialType: 'finished_muffin' as MaterialType, onHand: 100, inTransit: 0, orderQty: 0, reorderPoint: 0, safetyStock: 0 }
  };

  return {
    id: teamId,
    name: teamName,
    controllerId,
    status: 'active',
    cash: scenario.startCash,
    machines: defaultMachines,
    inventory: defaultInventory,
    purchaseOrders: [],
    machineOrders: [],
    contracts: scenario.contracts.map((c, i) => {
      const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
      return {
        ...c,
        id: `contract_${i}_${Date.now()}`,
        dailyQuantity: Math.round(c.dailyQuantity * randomFactor),
        priceMultiplier: Number((c.priceMultiplier * randomFactor).toFixed(1)),
        penalty: Number((c.penalty * randomFactor).toFixed(1)),
        active: false,
        status: 'offered',
        fulfilledToday: 0,
        totalFulfilled: 0,
        totalTarget: 0
      };
    }),
    activeEvents: scenario.events.map((e, i) => ({
      ...e,
      id: `event_${i}_${Date.now()}`,
      active: false
    })),
    cashHistory: [],
    history: {
      days: [], cash: [], revenue: [], demand: [],
      inventory: { base_mix: [], packaging_material: [], finished_muffin: [] },
      utilization: { mixing: [], baking: [], icing: [], packaging: [] },
      contractFulfillment: [], bottlenecks: [], bottleneckCapacity: []
    },
    report: {
      revenue: 0, costs: 0, profit: 0, fillRate: 100, lostSales: 0,
      inventoryTurnover: 0, averageInventory: 0, stockoutDays: 0,
      utilization: { mixing: 0, baking: 0, icing: 0, packaging: 0 },
      contractFulfillment: 100, finalCash: scenario.startCash
    },
    academicScore: {
      cashPerformance: 100, fillRateScore: 100, contractScore: 100,
      inventoryScore: 100, capacityScore: 100, totalScore: 100
    },
    currentBottleneck: { stage: 'None', capacity: 0 },
    breakdownStates: []
  };
}

export function registerSocketHandler(io: Server) {
  io.on('connection', (socket: Socket) => {
    let currentUser: { id: string; name: string; email: string; role: string } | null = null;
    let joinedRoomId: string | null = null;
    let joinedTeamId: string | null = null;

    // 1. JOIN ROOM AND TEAM
    socket.on('join_room', async (payload: { token: string; roomCode: string; teamName?: string }, callback: Function) => {
      const decoded = verifySocketToken(payload.token);
      if (!decoded) {
        return callback({ error: 'Authentication failed' });
      }
      currentUser = decoded;

      try {
        const room = await db.getRoomByCode((payload.roomCode || "").replace(/[^A-Za-z0-9]/g, '').toUpperCase());
        if (!room) {
          return callback({ error: 'Room not found' });
        }
        joinedRoomId = room.id;

        // Fetch Scenario details
        const scenario = room.scenarioId 
          ? await db.getScenarioById(room.scenarioId) 
          : (await db.getScenarios()).find(s => s.difficulty === room.difficulty);

        if (!scenario) {
          return callback({ error: 'Scenario configuration missing' });
        }

        // If user is instructor or admin, they join the room but do not need a team
        if (currentUser!.role === 'instructor' || currentUser!.role === 'admin') {
          socket.join(`room_${room.id}`);
          
          // Send all teams states in this room to the instructor
          const teams = await db.getTeamsInRoom(room.id);
          const teamStates = await Promise.all(
            teams.map(t => db.getTeamState(t.id))
          );

          callback({
            success: true,
            room,
            role: currentUser!.role,
            teamStates: teamStates.filter(Boolean),
            members: await db.getRoomMembers(room.id)
          });
          return;
        }

        // For operators, require teamName
        if (!payload.teamName) {
          return callback({ error: 'Team name is required for operators' });
        }

        const formattedTeamName = payload.teamName.trim();
        let team = await db.getTeamByRoomAndName(room.id, formattedTeamName);
        let isNewTeam = false;

        if (!team) {
          // Max rooms check or duplicate team limits? None specified. Create Team.
          const created = await db.createTeam(room.id, formattedTeamName, currentUser!.id);
          team = {
            id: created.id,
            roomId: created.roomId,
            name: created.name,
            controllerId: created.controllerId,
            status: 'active',
            cash: scenario.startCash,
            stateJson: '{}'
          };
          isNewTeam = true;
        }

        joinedTeamId = team.id;
        
        // Add member to room_members
        await db.joinRoom(room.id, team.id, currentUser!.id);

        // Fetch or create team state
        let teamState = await db.getTeamState(team.id);
        if (!teamState || isNewTeam) {
          teamState = createInitialTeamState(team.id, team.name, team.controllerId, scenario);
          await db.saveTeamState(team.id, teamState.cash, teamState.status, (teamState as any).allocationStrategy ? teamState : { ...teamState, allocationStrategy: 'contracts_first' } as any);
        }

        // Controller logic fallback
        // Check if current controller is active in team room. If no sockets are online for controller, assign this player.
        const teamRoomKey = `team_${team.id}`;
        const roomSockets = io.sockets.adapter.rooms.get(teamRoomKey);
        const hasOnlineClients = roomSockets && roomSockets.size > 0;

        if (!hasOnlineClients && team.controllerId !== currentUser!.id) {
          // If team is active but controller has left, assign the new joiner
          await db.updateTeamController(team.id, currentUser!.id);
          team.controllerId = currentUser!.id;
          teamState.controllerId = currentUser!.id;
          await db.saveTeamState(team.id, teamState.cash, teamState.status, teamState);
        }

        // Join socket rooms
        socket.join(`room_${room.id}`);
        socket.join(teamRoomKey);

        const role = team.controllerId === currentUser!.id ? 'controller' : 'observer';

        // Notify team room of member updates
        const members = await db.getRoomMembers(room.id);
        io.to(`room_${room.id}`).emit('members_updated', members);

        // Notify instructor dashboard of updated team list
        if (isNewTeam) {
          const allTeams = await db.getTeamsInRoom(room.id);
          const teamStates = await Promise.all(
            allTeams.map(t => db.getTeamState(t.id))
          );
          io.to(`room_${room.id}`).emit('instructor_teams_list', teamStates.filter(Boolean));
        }

        callback({
          success: true,
          room,
          teamState,
          role,
          members
        });

      } catch (err) {
        console.error('Socket join room error:', err);
        callback({ error: 'Internal server error' });
      }
    });

    // 2. OPERATOR ACTIONS
    socket.on('operator_action', async (payload: { actionType: string; details: any }, callback: Function) => {
      if (!currentUser || !joinedRoomId || !joinedTeamId) {
        return callback({ error: 'Not in a session' });
      }

      try {
        const team = await db.getTeamState(joinedTeamId);
        const room = await db.getRoomById(joinedRoomId);
        if (!team || !room) {
          return callback({ error: 'Session state not found' });
        }

        // Validate user is the team controller
        const teamMeta = await db.getTeamByRoomAndName(room.id, team.name);
        if (!teamMeta || teamMeta.controllerId !== currentUser.id) {
          return callback({ error: 'Only the team controller can modify factory settings' });
        }

        if (team.status === 'bankrupt') {
          return callback({ error: 'Factory is bankrupt and locked' });
        }

        // Get active scenario
        const scenario = room.scenarioId 
          ? await db.getScenarioById(room.scenarioId) 
          : (await db.getScenarios()).find(s => s.difficulty === room.difficulty);

        if (!scenario) {
          return callback({ error: 'Scenario configuration missing' });
        }

        const mConfigs = scenario.machineSettings;

        switch (payload.actionType) {
          case 'update_inventory_settings': {
            const { materialType, orderQty, reorderPoint, safetyStock } = payload.details;
            if (!materialType || orderQty === undefined || reorderPoint === undefined || safetyStock === undefined) {
              return callback({ error: 'Missing inventory fields' });
            }
            if (team.inventory[materialType as MaterialType]) {
              team.inventory[materialType as MaterialType].orderQty = Math.max(0, parseInt(orderQty));
              team.inventory[materialType as MaterialType].reorderPoint = Math.max(0, parseInt(reorderPoint));
              team.inventory[materialType as MaterialType].safetyStock = Math.max(0, parseInt(safetyStock));
            }
            break;
          }

          case 'buy_machine': {
            const { machineType } = payload.details;
            if (!machineType || !team.machines[machineType as MachineType]) {
              return callback({ error: 'Invalid machine type' });
            }
            const config = mConfigs[machineType as MachineType];
            const purchaseCost = config.purchaseCost;

            if (team.cash < purchaseCost) {
              return callback({ error: 'Insufficient cash to buy machine' });
            }

            // Create Machine Order (In Transit)
            const orderId = `mo_${room.currentDay}_${machineType}_${Math.random().toString(36).substr(2, 5)}`;
            const leadTime = scenario.leadTimes.machineProcurement;

            const newOrder: MachineOrder = {
              id: orderId,
              machineType: machineType as MachineType,
              orderDay: room.currentDay,
              arrivalDay: room.currentDay + leadTime,
              cost: purchaseCost,
              status: 'procuring'
            };

            team.machineOrders.push(newOrder);
            team.machines[machineType as MachineType].inTransit += 1;
            
            // Deduct cash immediately
            team.cash = Number((team.cash - purchaseCost).toFixed(2));
            break;
          }

          case 'toggle_machine_status': {
            const { machineType, activeCount } = payload.details;
            if (!machineType || activeCount === undefined) {
              return callback({ error: 'Invalid arguments' });
            }
            const m = team.machines[machineType as MachineType];
            if (!m) return callback({ error: 'Machine type not found' });

            const targetActive = Math.max(0, Math.min(m.count, parseInt(activeCount)));
            m.active = targetActive;
            break;
          }

          case 'update_allocation_strategy': {
            const { strategy } = payload.details; // 'contracts_first' | 'market_first' | 'split'
            if (!['contracts_first', 'market_first', 'split'].includes(strategy)) {
              return callback({ error: 'Invalid allocation strategy' });
            }
            (team as any).allocationStrategy = strategy;
            break;
          }

          case 'update_contract_status': {
            const { contractId, status } = payload.details;
            if (!contractId || !status || !['accepted', 'declined'].includes(status)) {
              return callback({ error: 'Invalid contract arguments' });
            }
            const contract = team.contracts.find((c: any) => c.id === contractId);
            if (!contract) {
              return callback({ error: 'Contract not found' });
            }
            if (contract.status !== 'offered') {
              return callback({ error: 'Contract already processed' });
            }
            contract.status = status;
            break;
          }

          default:
            return callback({ error: 'Unknown action type' });
        }

        // Save state and notify team
        await db.saveTeamState(team.id, team.cash, team.status, team);
        io.to(`team_${team.id}`).emit('team_state_updated', team);
        
        // Notify instructor
        io.to(`room_${room.id}`).emit('instructor_team_updated', team);

        callback({ success: true });
      } catch (err) {
        console.error('Operator action error:', err);
        callback({ error: 'Internal server error' });
      }
    });

    // 3. INSTRUCTOR CONTROLS
    socket.on('instructor_control', async (payload: { controlType: string; details?: any }, callback: Function) => {
      if (!currentUser || (currentUser.role !== 'instructor' && currentUser.role !== 'admin')) {
        return callback({ error: 'Unauthorized: instructors or admins only' });
      }
      if (!joinedRoomId) {
        return callback({ error: 'Not inside a room' });
      }

      try {
        const room = await db.getRoomById(joinedRoomId);
        if (!room) {
          return callback({ error: 'Room not found' });
        }

        switch (payload.controlType) {
          case 'start':
            if (room.status === 'active') {
              return callback({ error: 'Simulation is already running' });
            }
            room.status = 'active';
            await db.updateRoom(room.id, { status: 'active' });
            startRoomTick(io, room.id);
            break;

          case 'pause':
            room.status = 'paused';
            await db.updateRoom(room.id, { status: 'paused' });
            stopRoomTick(room.id);
            break;

          case 'resume':
            if (room.status === 'active') {
              return callback({ error: 'Simulation is already running' });
            }
            room.status = 'active';
            await db.updateRoom(room.id, { status: 'active' });
            startRoomTick(io, room.id);
            break;

          case 'step':
            // Step manually by 1 day
            await executeDayTick(io, room.id);
            break;

          case 'speed': {
            const { speed } = payload.details; // seconds per day
            if (!speed || speed < 1 || speed > 60) {
              return callback({ error: 'Invalid tick speed' });
            }
            room.tickRate = parseInt(speed);
            await db.updateRoom(room.id, { tickRate: room.tickRate });
            
            // Restart timer if active
            if (room.status === 'active') {
              stopRoomTick(room.id);
              startRoomTick(io, room.id);
            }
            break;
          }

          case 'inject_event': {
            const { name, startDay, endDay, description, targetVariable, modifier } = payload.details;
            if (!name || !description || !targetVariable || modifier === undefined) {
              return callback({ error: 'Missing event details' });
            }

            // Fetch all teams in room
            const teams = await db.getTeamsInRoom(room.id);
            const evId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

            for (const t of teams) {
              const teamState = await db.getTeamState(t.id);
              if (teamState) {
                teamState.activeEvents.push({
                  id: evId,
                  name,
                  startDay: parseInt(startDay) || room.currentDay,
                  endDay: parseInt(endDay) || (room.currentDay + 5),
                  description,
                  targetVariable,
                  modifier: parseFloat(modifier),
                  active: false
                });
                await db.saveTeamState(t.id, teamState.cash, teamState.status, teamState);
                io.to(`team_${t.id}`).emit('team_state_updated', teamState);
              }
            }
            break;
          }

          case 'relief_credits': {
            const teams = await db.getTeamsInRoom(room.id);
            for (const t of teams) {
              const teamState = await db.getTeamState(t.id);
              if (teamState) {
                teamState.inventory.base_mix.onHand += 2000;
                await db.saveTeamState(t.id, teamState.cash, teamState.status, teamState);
                io.to(`team_${t.id}`).emit('team_state_updated', teamState);
              }
            }
            break;
          }

          case 'override_team_state': {
            const { teamId, balance, rawMaterials, orderQuantity, reorderPoint } = payload.details;
            const teamState = await db.getTeamState(teamId);
            if (teamState) {
              if (balance !== undefined && !isNaN(balance)) {
                teamState.cash = balance;
              }
              if (rawMaterials !== undefined && !isNaN(rawMaterials)) {
                teamState.inventory.base_mix.onHand = rawMaterials;
                teamState.inventory.packaging_material.onHand = Math.round(rawMaterials * 0.8);
              }
              if (orderQuantity !== undefined && !isNaN(orderQuantity)) {
                teamState.inventory.base_mix.orderQty = orderQuantity;
                teamState.inventory.packaging_material.orderQty = orderQuantity;
              }
              if (reorderPoint !== undefined && !isNaN(reorderPoint)) {
                teamState.inventory.base_mix.reorderPoint = reorderPoint;
                teamState.inventory.packaging_material.reorderPoint = Math.round(reorderPoint * 0.8);
              }
              await db.saveTeamState(teamId, teamState.cash, teamState.status, teamState);
              io.to(`team_${teamId}`).emit('team_state_updated', teamState);
              
              // Broadcast updated teams to all room observers/instructors
              const allTeams = await db.getTeamsInRoom(room.id);
              const teamStates = await Promise.all(allTeams.map(tr => db.getTeamState(tr.id)));
              io.to(`room_${room.id}`).emit('instructor_teams_list', teamStates.filter(Boolean));
            }
            break;
          }

          case 'kick_team': {
            const { teamId } = payload.details;
            if (teamId) {
              await db.deleteTeam(teamId);
              // Notify the team room that they are kicked
              io.to(`team_${teamId}`).emit('kicked');
              
              // Broadcast updated room members and team list
              const members = await db.getRoomMembers(room.id);
              io.to(`room_${room.id}`).emit('members_updated', members);
              
              const allTeams = await db.getTeamsInRoom(room.id);
              const teamStates = await Promise.all(allTeams.map(tr => db.getTeamState(tr.id)));
              io.to(`room_${room.id}`).emit('instructor_teams_list', teamStates.filter(Boolean));
            }
            break;
          }

          case 'end':
            room.status = 'finished';
            await db.updateRoom(room.id, { status: 'finished' });
            stopRoomTick(room.id);
            break;

          default:
            return callback({ error: 'Unknown control type' });
        }

        // Notify room
        const updatedRoom = await db.getRoomById(room.id);
        io.to(`room_${room.id}`).emit('room_updated', updatedRoom);
        callback({ success: true, room: updatedRoom });

      } catch (err) {
        console.error('Instructor control error:', err);
        callback({ error: 'Internal server error' });
      }
    });

    // 4. DISCONNECT
    socket.on('disconnect', async () => {
      if (currentUser && joinedTeamId && joinedRoomId) {
        console.log(`User ${currentUser.name} disconnected from team ${joinedTeamId}`);
        // Handle controller handover if the controller disconnected
        try {
          const team = await db.getTeamState(joinedTeamId);
          const room = await db.getRoomById(joinedRoomId);
          if (team && room) {
            const teamRoomKey = `team_${team.id}`;
            const socketsInTeam = io.sockets.adapter.rooms.get(teamRoomKey);
            
            // Check if there are other players currently in the team socket room
            if (socketsInTeam && socketsInTeam.size > 0 && team.controllerId === currentUser.id) {
              // Find another socket in this room and resolve its user ID
              const nextSocketId = Array.from(socketsInTeam)[0];
              const nextSocket = io.sockets.sockets.get(nextSocketId);
              
              if (nextSocket && (nextSocket as any).currentUser) {
                const nextUser = (nextSocket as any).currentUser;
                await db.updateTeamController(team.id, nextUser.id);
                team.controllerId = nextUser.id;
                await db.saveTeamState(team.id, team.cash, team.status, team);

                // Let the clients know about the role change
                io.to(teamRoomKey).emit('controller_changed', { controllerId: nextUser.id });
                io.to(teamRoomKey).emit('team_state_updated', team);
              }
            }
          }
        } catch (err) {
          console.error('Disconnect handover error:', err);
        }
      }
    });

    // Attach user payload to socket for disconnect references
    (socket as any).currentUser = currentUser;
  });
}

// Tick Manager helper: starts simulation loop for a room
function startRoomTick(io: Server, roomId: string) {
  if (activeTimers[roomId]) return;

  const runTick = async () => {
    try {
      await executeDayTick(io, roomId);
    } catch (err) {
      console.error(`Error running tick for room ${roomId}:`, err);
    }
  };

  db.getRoomById(roomId).then(room => {
    if (room && room.status === 'active') {
      const intervalMs = room.tickRate * 1000;
      activeTimers[roomId] = setInterval(runTick, intervalMs);
      console.log(`Started simulation daily tick for room ${roomId} (speed: ${room.tickRate}s/day)`);
    }
  });
}

// Tick Manager helper: stops loop
function stopRoomTick(roomId: string) {
  if (activeTimers[roomId]) {
    clearInterval(activeTimers[roomId]);
    delete activeTimers[roomId];
    console.log(`Stopped simulation tick for room ${roomId}`);
  }
}

// Core executor that runs a single daily step, increments room day, and broadcasts updates
async function executeDayTick(io: Server, roomId: string) {
  const room = await db.getRoomById(roomId);
  if (!room) return;

  if (room.currentDay >= room.maxDays) {
    room.status = 'finished';
    await db.updateRoom(room.id, { status: 'finished' });
    stopRoomTick(room.id);
    io.to(`room_${room.id}`).emit('room_updated', room);
    return;
  }

  // Load Scenario details
  const scenario = room.scenarioId 
    ? await db.getScenarioById(room.scenarioId) 
    : (await db.getScenarios()).find(s => s.difficulty === room.difficulty);

  if (!scenario) return;

  // Increment Day
  const nextDay = room.currentDay + 1;
  await db.updateRoom(room.id, { currentDay: nextDay });
  room.currentDay = nextDay;

  // Resolve today's market demand based on scenario configuration
  const demandVal = getDemandForDay(nextDay, scenario.demand);

  // Fetch all teams in room
  const teams = await db.getTeamsInRoom(room.id);
  const updatedStates: TeamState[] = [];

  for (const t of teams) {
    const teamState = await db.getTeamState(t.id);
    if (teamState) {
      // Execute the daily simulation step
      const nextTeamState = runSimDay(
        room,
        teamState,
        demandVal,
        scenario.machineSettings,
        scenario.rawMaterialCosts,
        scenario.leadTimes,
        scenario.holdingCostRate,
        scenario.lostSalesPenaltyRate,
        scenario.breakdownsEnabled
      );

      // Save state to DB
      await db.saveTeamState(t.id, nextTeamState.cash, nextTeamState.status, nextTeamState);
      
      // Emit update to this team
      io.to(`team_${t.id}`).emit('team_state_updated', nextTeamState);
      updatedStates.push(nextTeamState);
    }
  }

  // Calculate Leaderboard
  // Rank active teams first by cash then by profit, bankrupt teams at bottom
  const leaderboard: any[] = updatedStates.map(t => ({
    teamId: t.id,
    teamName: t.name,
    cash: t.cash,
    profit: t.report.profit,
    status: t.status
  }));

  leaderboard.sort((a, b) => {
    if (a.status === 'active' && b.status === 'bankrupt') return -1;
    if (a.status === 'bankrupt' && b.status === 'active') return 1;
    if (a.cash !== b.cash) return b.cash - a.cash;
    return b.profit - a.profit;
  });

  const formattedLeaderboard = leaderboard.map((entry, idx) => ({
    rank: idx + 1,
    teamId: entry.teamId,
    teamName: entry.teamName,
    cash: entry.cash,
    profit: entry.profit,
    status: entry.status
  }));

  // Broadcast updates
  io.to(`room_${room.id}`).emit('room_updated', room);
  io.to(`room_${room.id}`).emit('leaderboard_updated', formattedLeaderboard);
  io.to(`room_${room.id}`).emit('instructor_teams_list', updatedStates);

  console.log(`Executed Day ${nextDay} tick for room ${room.name} (${room.code}). Demand: ${demandVal}. Total Teams: ${teams.length}`);
}
