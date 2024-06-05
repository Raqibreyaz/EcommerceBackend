import express from 'express'

const router = express.Router()

router.route('get-review').get()

router.route('edit-review').put()

router.route('add-review').post()

export default router