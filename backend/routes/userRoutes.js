const router = require('express').Router();
const { listStaff, createUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/staff', listStaff);
router.post('/', createUser);

module.exports = router;
