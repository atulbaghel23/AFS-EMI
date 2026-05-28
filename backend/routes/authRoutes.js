import express from 'express';
const router = express.Router();
import { login, register, forgotPassword, resetPassword } from '../controllers/authController.js';

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
