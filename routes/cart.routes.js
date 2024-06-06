import express from 'express'
import { addToCart, fetchCart, deleteProductFromCart, fetchNoOfItems } from '../controllers/cart.controllers.js'
import { verifyCustomer } from '../middlewares/verifyUser.js'
const router = express.Router()

router.use(verifyCustomer)

router.route('/add-product/:id').post(addToCart)
router.route('/delete-product/:id').delete(deleteProductFromCart)
router.route('/get-cart').get(fetchCart)
router.route('/fetch-items').get(fetchNoOfItems)


export default router