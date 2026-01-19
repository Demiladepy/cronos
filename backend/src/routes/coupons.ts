import express from 'express';
import { CouponData } from '../types/index.js';
import pool from '../db/pool.js';

const router = express.Router();

/**
 * GET /api/coupons/:store
 * Get available coupons for a specific store
 */
router.get('/:store', async (req, res, next) => {
    try {
        const { store } = req.params;

        if (!store) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Store parameter is required',
                statusCode: 400,
            });
        }

        // Query database for coupons
        const result = await pool.query(
            `SELECT code, description, discount, store, expires_at, verified
       FROM coupons
       WHERE LOWER(store) = LOWER($1)
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY verified DESC, expires_at ASC
       LIMIT 20`,
            [store]
        );

        const coupons: CouponData[] = result.rows.map((row) => ({
            code: row.code,
            description: row.description,
            discount: row.discount,
            expiresAt: row.expires_at,
            verified: row.verified,
            store: row.store,
        }));

        res.json({
            store,
            coupons,
            count: coupons.length,
        });
    } catch (error: any) {
        next(error);
    }
});

/**
 * POST /api/coupons
 * Add a new coupon (admin endpoint - should be protected in production)
 */
router.post('/', async (req, res, next) => {
    try {
        const { code, description, discount, store, expiresAt, verified } = req.body;

        if (!code || !store) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Code and store are required',
                statusCode: 400,
            });
        }

        const result = await pool.query(
            `INSERT INTO coupons (code, description, discount, store, expires_at, verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [code, description, discount, store, expiresAt, verified || false]
        );

        res.status(201).json({
            message: 'Coupon added successfully',
            coupon: result.rows[0],
        });
    } catch (error: any) {
        next(error);
    }
});

export default router;
