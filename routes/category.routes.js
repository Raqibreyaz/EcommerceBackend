import express from "express"

const router = express.Router()

router.route('/add-category').post()
router.route('/get-categories').get()
router.route('edit-category').put()
router.route('delete-category').delete()

export default router;