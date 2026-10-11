const router = require('express').Router();
const { overview } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'hod'), overview);

module.exports = router;
