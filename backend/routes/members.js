import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createMember, listMembers, updateMember, deleteMember } from '../controllers/memberController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', listMembers);
router.post('/', createMember);
router.put('/:id', updateMember);
router.delete('/:id', deleteMember);

export default router;
