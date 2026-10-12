import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/db.js';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from './middleware.js';
import { LicenseRecord, User } from '../types/index.js';

const router = Router();

// 1. List licenses (Admin only, active archive view + security sanitization)
router.get('/', authenticateJWT, authorizeRoles(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await db.getLicenses();
    // Sanitize response: never leak instructor passwords
    const sanitized = list.map(lic => {
      const { instructorPassword, ...safe } = lic;
      return safe;
    });
    res.json(sanitized);
  } catch (err) {
    console.error('Error listing licenses:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Create new license with strict positive whole number validityDays (Admin only)
router.post('/', authenticateJWT, authorizeRoles(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { customerName, email, maxSeats, validityDays, instructorEmail, instructorPassword } = req.body;

  if (!customerName || !email || !maxSeats || !validityDays || !instructorEmail || !instructorPassword) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  const cleanCustomer = String(customerName).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanInstEmail = String(instructorEmail).trim().toLowerCase();
  const cleanInstPass = String(instructorPassword).trim();

  // Validate validityDays: must be a positive whole integer
  const daysNum = Number(validityDays);
  if (!Number.isInteger(daysNum) || daysNum <= 0) {
    res.status(400).json({ error: 'License Validity (Days) must be a positive whole number (e.g., 10).' });
    return;
  }

  // Validate seats
  const seatsNum = Number(maxSeats);
  if (!Number.isInteger(seatsNum) || seatsNum <= 0) {
    res.status(400).json({ error: 'Max Student Logins must be a positive integer.' });
    return;
  }

  try {
    const code = 'LIC-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const existing = await db.getLicenseById(code);
    if (existing) {
      res.status(409).json({ error: 'License code collision, please retry.' });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + daysNum * 24 * 60 * 60 * 1000);

    // Auto-provision or update instructor user account in DB
    const existingUser = await db.getUserByEmail(cleanInstEmail);
    const passwordHash = await bcrypt.hash(cleanInstPass, 10);
    if (existingUser) {
      await db.saveUserRaw({
        id: existingUser.id,
        name: `Instructor (${cleanCustomer})`,
        email: cleanInstEmail,
        role: 'instructor',
        createdAt: existingUser.createdAt || now,
        passwordHash
      });
    } else {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await db.saveUserRaw({
        id: userId,
        name: `Instructor (${cleanCustomer})`,
        email: cleanInstEmail,
        role: 'instructor',
        createdAt: now,
        passwordHash
      });
    }

    const newLicense: LicenseRecord = {
      id: code,
      customerName: cleanCustomer,
      email: cleanEmail,
      maxSeats: seatsNum,
      validityDays: daysNum,
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      startDate: now.toISOString().split('T')[0],
      endDate: expiresAt.toISOString().split('T')[0],
      instructorEmail: cleanInstEmail
    };

    await db.saveLicense(newLicense);

    res.status(201).json({
      success: true,
      license: newLicense,
      message: `License "${code}" generated with ${daysNum} days validity. Expiration date: ${expiresAt.toLocaleDateString()}.`
    });
  } catch (err) {
    console.error('Error generating license:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Toggle license status
router.patch('/:id/toggle', authenticateJWT, authorizeRoles(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const lic = await db.getLicenseById(id);
    if (!lic) {
      res.status(404).json({ error: 'License not found' });
      return;
    }

    if (db.isLicenseExpired(lic)) {
      res.status(400).json({ error: 'Cannot reactivate an expired license.' });
      return;
    }

    lic.status = lic.status === 'active' ? 'suspended' : 'active';
    await db.saveLicense(lic);
    res.json({ success: true, status: lic.status });
  } catch (err) {
    console.error('Error toggling license status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Delete license
router.delete('/:id', authenticateJWT, authorizeRoles(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await db.deleteLicense(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting license:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
