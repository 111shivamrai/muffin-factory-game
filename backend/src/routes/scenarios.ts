import { Router, Response } from 'express';
import { db } from '../db/db.js';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from './middleware.js';
import { SavedScenario } from '../types/index.js';

const router = Router();

// Retrieve scenarios (Instructors and Admins)
router.get('/', authenticateJWT, authorizeRoles(['admin', 'instructor']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await db.getScenarios();
    res.json(list);
  } catch (err) {
    console.error('Error fetching scenarios:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Retrieve specific scenario
router.get('/:id', authenticateJWT, authorizeRoles(['admin', 'instructor']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sc = await db.getScenarioById(req.params.id);
    if (!sc) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }
    res.json(sc);
  } catch (err) {
    console.error('Error fetching scenario details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save or Update Scenario
router.post('/', authenticateJWT, authorizeRoles(['admin', 'instructor']), async (req: AuthenticatedRequest, res: Response) => {
  const { id, name, description, learningObjective, instructorNotes, difficulty, maxDays, tickRate, startCash, rawMaterialCosts, leadTimes, breakdownsEnabled, demand, machineSettings, contracts, events, objectives, holdingCostRate, lostSalesPenaltyRate } = req.body;

  if (!name || !difficulty || !maxDays || !tickRate || !startCash || !demand || !machineSettings) {
    res.status(400).json({ error: 'Missing required scenario configurations' });
    return;
  }

  try {
    const creatorId = req.user!.id;
    const scenarioId = id || `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const sc: SavedScenario = {
      id: scenarioId,
      name,
      description: description || learningObjective || '',
      learningObjective: learningObjective || '',
      instructorNotes: instructorNotes || '',
      difficulty,
      maxDays,
      tickRate,
      startCash,
      startInventory: req.body.startInventory,
      startMachines: req.body.startMachines,
      sellingPrice: req.body.sellingPrice,
      starsThresholds: req.body.starsThresholds,
      holdingCostRate: holdingCostRate !== undefined ? parseFloat(holdingCostRate) : 0.02,
      lostSalesPenaltyRate: lostSalesPenaltyRate !== undefined ? parseFloat(lostSalesPenaltyRate) : 2.5,
      rawMaterialCosts: rawMaterialCosts || { baseMix: 5.0, packaging: 1.0, orderCost: 150.0 },
      leadTimes: leadTimes || { rawMaterial: 3, packagingMaterial: 2, machineProcurement: 5 },
      breakdownsEnabled: breakdownsEnabled !== false,
      demand,
      machineSettings,
      contracts: contracts || [],
      events: events || [],
      objectives: objectives || ['max_cash'],
      creatorId,
      createdAt: new Date()
    };

    const saved = await db.saveScenario(sc);
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error saving scenario:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Duplicate Scenario
router.post('/:id/duplicate', authenticateJWT, authorizeRoles(['admin', 'instructor']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const original = await db.getScenarioById(req.params.id);
    if (!original) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }

    const duplicated: SavedScenario = {
      ...original,
      id: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `${original.name} (Copy)`,
      creatorId: req.user!.id,
      createdAt: new Date()
    };

    const saved = await db.saveScenario(duplicated);
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error duplicating scenario:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Scenario
router.delete('/:id', authenticateJWT, authorizeRoles(['admin', 'instructor']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const SYSTEM_PRESET_IDS = [
      'scenario_beginner_preset',
      'scenario_intermediate_preset',
      'scenario_intermediate_10min_preset',
      'scenario_advanced_preset',
      'scenario_advanced_10min_preset'
    ];
    if (SYSTEM_PRESET_IDS.includes(req.params.id)) {
      res.status(403).json({ error: 'System standard presets cannot be deleted' });
      return;
    }
    const original = await db.getScenarioById(req.params.id);
    if (!original) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }

    await db.deleteScenario(req.params.id);
    res.json({ success: true, message: 'Scenario deleted successfully' });
  } catch (err) {
    console.error('Error deleting scenario:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
