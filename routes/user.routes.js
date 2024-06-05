import express from 'express'
import { loginUser, registerAdmin, registerCustomer, registerUser } from '../controllers/user.controllers.js'
import { verifyAdmin, verifyCustomer } from '../middlewares/verifyUser.js'
import orderRouter from '../routes/orders.routes.js'
import wishlistRouter from '../routes/wishlist.routes.js'

const router = express.Router()

router.use('/wishlist',wishlistRouter)
router.use('/orders',orderRouter)

router.route('/register/customer')
    .post(registerCustomer)

router.route('/register/admin')
    .post(registerAdmin)

router.route('/addnew')
    .post(verifyAdmin, registerUser)

router.route('/login')
    .post(loginUser)

export default router