import express from 'express'
import { fetchUser, loginUser, registerUser, logoutUser } from '../controllers/user.controllers.js'
import { verifyAdmin, verifyCustomer } from '../middlewares/verifyUser.js'
import orderRouter from '../routes/orders.routes.js'
import wishlistRouter from '../routes/wishlist.routes.js'
import cartRouter from '../routes/cart.routes.js'
import { upload } from '../middlewares/upload.middlewares.js'

const router = express.Router()

router.use('/wishlist', wishlistRouter)
router.use('/orders', orderRouter)
router.use('/cart', cartRouter)

router.route('/register')
    .post(upload.single('avatar'), registerUser)

router.route('/addnew')
    .post(verifyAdmin, upload.single('avatar'), registerUser)

router.route('/login')
    .post(loginUser)

router.route('/fetch-user')
    .get(verifyCustomer, fetchUser)

router.route('/logout')
    .get(verifyCustomer, logoutUser)

export default router