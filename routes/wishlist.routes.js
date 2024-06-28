import express from 'express'
import {
    addProductToWishlist,
    removeProductFromWishlist,
    fetchWishlist
} from '../controllers/wishlist.controllers.js'
import { verifyCustomer } from '../middlewares/verifyUser.js'

const router = express.Router()

router.use(verifyCustomer)

router.route('/add-product')
    .put(addProductToWishlist)
router.route('/delete-product')
    .delete(removeProductFromWishlist)
router.route('/get-wishlist')
    .get(fetchWishlist)

export default router