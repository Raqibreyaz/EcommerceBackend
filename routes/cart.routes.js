import express from 'express'

const router = express.Router()

router.route('add-product').post()
router.route('delete-product').delete()
router.route('get-cart').get()

export default router