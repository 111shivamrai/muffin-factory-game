import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { User, Room, TeamState, LeaderboardEntry, SavedScenario } from '../../../backend/src/types/index.js';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return window.location.origin;
  }
  return 'http://localhost:5001';
};
export const API_URL = getApiUrl();

interface GameStore {
  // Auth State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;

  // Real-time State
  socket: Socket | null;
  room: Room | null;
  role: 'controller' | 'observer' | 'instructor' | 'admin' | null;
  teamState: TeamState | null;
  members: { userId: string; userName: string; teamId: string; teamName: string }[];
  leaderboard: LeaderboardEntry[];
  instructorTeams: TeamState[]; // For instructor dashboard review
  initSocket: (token: string) => void;
  joinRoom: (roomCode: string, teamName?: string) => Promise<any>;
  disconnectSocket: () => void;

  // Operator Actions
  updateInventorySettings: (materialType: string, orderQty: number, reorderPoint: number, safetyStock: number) => Promise<void>;
  buyMachine: (machineType: string) => Promise<void>;
  toggleMachineStatus: (machineType: string, activeCount: number) => Promise<void>;
  updateAllocationStrategy: (strategy: 'contracts_first' | 'market_first' | 'split') => Promise<void>;
  updateContractStatus: (contractId: string, status: 'accepted' | 'declined') => Promise<void>;

  // Instructor Actions
  instructorControl: (controlType: string, details?: any) => Promise<void>;

  // Scenarios and Rooms Lists (Instructors / Admin)
  scenarios: SavedScenario[];
  roomsList: Room[];
  loadScenarios: () => Promise<void>;
  loadRooms: () => Promise<void>;
  createScenario: (scenario: Partial<SavedScenario>) => Promise<SavedScenario>;
  duplicateScenario: (id: string) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;
  createRoom: (name: string, difficulty: string, tickRate: number, maxDays: number, scenarioId?: string) => Promise<Room>;
  deleteRoom: (id: string) => Promise<void>;
}

// Read initial auth state from localStorage
const storedToken = localStorage.getItem('muffin_token');
const storedUser = localStorage.getItem('muffin_user');
let parsedUser: User | null = null;
if (storedUser) {
  try {
    parsedUser = JSON.parse(storedUser);
  } catch {
    localStorage.removeItem('muffin_user');
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Auth Initialization
  user: parsedUser,
  token: storedToken,
  isAuthenticated: !!storedToken && !!parsedUser,

  login: (token, user) => {
    localStorage.setItem('muffin_token', token);
    localStorage.setItem('muffin_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
    get().initSocket(token);
  },

  logout: () => {
    localStorage.removeItem('muffin_token');
    localStorage.removeItem('muffin_user');
    get().disconnectSocket();
    set({ token: null, user: null, isAuthenticated: false, room: null, teamState: null, role: null });
  },

  // Sockets & Real-time State
  socket: null,
  room: null,
  role: null,
  teamState: null,
  members: [],
  leaderboard: [],
  instructorTeams: [],

  initSocket: (token) => {
    // If existing socket, disconnect first
    const currentSocket = get().socket;
    if (currentSocket) {
      currentSocket.disconnect();
    }

    const socket = io(API_URL, {
      auth: { token }
    });

    // Handle common real-time sync messages
    socket.on('room_updated', (updatedRoom: Room) => {
      set({ room: updatedRoom });
    });

    socket.on('team_state_updated', (updatedTeam: TeamState) => {
      set({ teamState: updatedTeam });
    });

    socket.on('leaderboard_updated', (updatedLeaderboard: LeaderboardEntry[]) => {
      set({ leaderboard: updatedLeaderboard });
    });

    socket.on('members_updated', (updatedMembers: any[]) => {
      set({ members: updatedMembers });
    });

    socket.on('instructor_teams_list', (teams: TeamState[]) => {
      set({ instructorTeams: teams });
    });

    socket.on('instructor_team_updated', (updatedTeam: TeamState) => {
      const current = get().instructorTeams;
      const nextTeams = current.map(t => t.id === updatedTeam.id ? updatedTeam : t);
      set({ instructorTeams: nextTeams });
    });

    socket.on('controller_changed', ({ controllerId }) => {
      const user = get().user;
      if (user) {
        const newRole = controllerId === user.id ? 'controller' : 'observer';
        set({ role: newRole as any });
      }
    });

    set({ socket });
  },

  joinRoom: (roomCode, teamName) => {
    return new Promise((resolve, reject) => {
      const s = get().socket;
      const t = get().token;
      
      // If socket not initialized yet, do it now
      if (!s && t) {
        get().initSocket(t);
      }

      // Re-fetch socket reference
      const activeSocket = get().socket || io(API_URL, { auth: { token: t } });
      if (!get().socket) {
        set({ socket: activeSocket });
      }

      activeSocket.emit('join_room', { token: t, roomCode, teamName }, (response: any) => {
        if (response.error) {
          reject(response.error);
        } else {
          set({
            room: response.room,
            role: response.role,
            teamState: response.teamState || null,
            members: response.members || [],
            instructorTeams: response.teamStates || []
          });
          resolve(response);
        }
      });
    });
  },

  disconnectSocket: () => {
    const s = get().socket;
    if (s) {
      s.disconnect();
      set({ socket: null });
    }
  },

  // Operator Actions
  updateInventorySettings: async (materialType, orderQty, reorderPoint, safetyStock) => {
    const s = get().socket;
    if (!s) return;
    s.emit('operator_action', {
      actionType: 'update_inventory_settings',
      details: { materialType, orderQty, reorderPoint, safetyStock }
    }, (res: any) => {
      if (res && res.error) {
        alert(res.error);
      }
    });
  },

  buyMachine: async (machineType) => {
    const s = get().socket;
    if (!s) return;
    s.emit('operator_action', {
      actionType: 'buy_machine',
      details: { machineType }
    }, (res: any) => {
      if (res && res.error) {
        alert(res.error);
      }
    });
  },

  toggleMachineStatus: async (machineType, activeCount) => {
    const s = get().socket;
    if (!s) return;
    s.emit('operator_action', {
      actionType: 'toggle_machine_status',
      details: { machineType, activeCount }
    }, (res: any) => {
      if (res && res.error) {
        alert(res.error);
      }
    });
  },

  updateAllocationStrategy: async (strategy) => {
    const s = get().socket;
    if (!s) return;
    s.emit('operator_action', {
      actionType: 'update_allocation_strategy',
      details: { strategy }
    }, (res: any) => {
      if (res && res.error) {
        alert(res.error);
      }
    });
  },

  updateContractStatus: async (contractId, status) => {
    const s = get().socket;
    if (!s) return;
    s.emit('operator_action', {
      actionType: 'update_contract_status',
      details: { contractId, status }
    }, (res: any) => {
      if (res && res.error) {
        alert(res.error);
      }
    });
  },

  // Instructor Controls
  instructorControl: async (controlType, details) => {
    const s = get().socket;
    if (!s) return;
    s.emit('instructor_control', { controlType, details }, (res: any) => {
      if (res && res.error) {
        alert(res.error);
      }
    });
  },

  // SCENARIOS & ROOMS CRUD API
  scenarios: [],
  roomsList: [],

  loadScenarios: async () => {
    const t = get().token;
    if (!t) return;
    try {
      const res = await fetch(`${API_URL}/api/scenarios`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        set({ scenarios: data });
      }
    } catch (err) {
      console.error('Error loading scenarios:', err);
    }
  },

  loadRooms: async () => {
    const t = get().token;
    if (!t) return;
    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        set({ roomsList: data });
      }
    } catch (err) {
      console.error('Error loading rooms:', err);
    }
  },

  createScenario: async (scenario) => {
    const t = get().token;
    if (!t) throw new Error('Not authenticated');
    const res = await fetch(`${API_URL}/api/scenarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`
      },
      body: JSON.stringify(scenario)
    });
    const saved = await res.json();
    if (saved.error) throw new Error(saved.error);
    get().loadScenarios();
    return saved;
  },

  duplicateScenario: async (id) => {
    const t = get().token;
    if (!t) return;
    const res = await fetch(`${API_URL}/api/scenarios/${id}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` }
    });
    const saved = await res.json();
    if (saved.error) alert(saved.error);
    get().loadScenarios();
  },

  deleteScenario: async (id) => {
    const t = get().token;
    if (!t) return;
    await fetch(`${API_URL}/api/scenarios/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` }
    });
    get().loadScenarios();
  },

  createRoom: async (name, difficulty, tickRate, maxDays, scenarioId) => {
    const t = get().token;
    if (!t) throw new Error('Not authenticated');
    const res = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`
      },
      body: JSON.stringify({ name, difficulty, tickRate, maxDays, scenarioId })
    });
    const created = await res.json();
    if (created.error) throw new Error(created.error);
    get().loadRooms();
    return created;
  },

  deleteRoom: async (id) => {
    const t = get().token;
    if (!t) return;
    await fetch(`${API_URL}/api/rooms/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` }
    });
    get().loadRooms();
  }
}));

// Automatically trigger socket sync if token is stored on load
if (storedToken) {
  useGameStore.getState().initSocket(storedToken);
}
