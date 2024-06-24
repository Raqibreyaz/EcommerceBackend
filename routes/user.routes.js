import express from 'express'
import { fetchUser, loginUser, registerUser, logoutUser, editUserProfile, changeUserAvatar, addNewAddress } from '../controllers/user.controllers.js'
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

    

router.use(verifyCustomer)

router.route('/fetch-user')
    .get(fetchUser)

router.route('/logout')
    .get(logoutUser)

router.route('/edit-profile')
    .put(editUserProfile)

router.route('/edit-profile/avatar')
    .patch(upload.single('avatar'), changeUserAvatar)

router.route('/edit-profile/address')
    .patch(addNewAddress)

export default router