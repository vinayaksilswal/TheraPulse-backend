import express from 'express';
import prisma from '../db.js';

const router = express.Router();


// Order management (GET all, PATCH status) has been moved to the Python Admin backend.
// Vercel only handles creating orders via the PayPal capture route.

export default router;
