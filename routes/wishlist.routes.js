import express from 'express'
import {
    addProductToWishlist,
    removeProductFromWishlist,
    fetchWishlist,
    isProductInWishlist
} from '../controllers/wishlist.controllers.js'
import { verifyCustomer } from '../middlewares/verifyUser.js'

const router = express.Router()

router.use(verifyCustomer)

router.route('/add-product/:id')
    .put(addProductToWishlist)
router.route('/delete-product/:id')
    .delete(removeProductFromWishlist)
router.route('/get-wishlist')
    .get(fetchWishlist)
router.route('/in-wishlist/:id')
    .get(isProductInWishlist)

export default router