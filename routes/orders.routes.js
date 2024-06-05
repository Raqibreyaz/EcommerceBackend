import express from 'express'

const router = express.Router()

router.route('get-orders').get()
router.route('get-allorders').get()
router.route('add-order').post()
router.route('edit-order').put()

export default router