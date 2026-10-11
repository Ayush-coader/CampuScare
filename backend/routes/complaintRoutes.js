const router = require('express').Router();
const ctrl = require('../controllers/complaintController');
const comments = require('../controllers/commentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

// Static paths must come before /:id
router.get('/feed', ctrl.feed);
router.get('/similar', ctrl.similar);

router
  .route('/')
  .get(ctrl.list)
  .post(authorize('student'), upload.single('image'), ctrl.create);

router.route('/:id').get(ctrl.get).delete(ctrl.remove);

router.patch('/:id/status', authorize('staff', 'admin'), ctrl.updateStatus);
router.patch('/:id/triage', authorize('admin'), ctrl.triage);
router.post('/:id/upvote', ctrl.toggleUpvote);
router.post('/:id/rating', authorize('student'), ctrl.rate);

router.route('/:id/comments').get(comments.list).post(comments.create);

module.exports = router;
