import express from 'express'
import { loginUser, registerAdmin, registerCustomer, registerUser } from '../controllers/user.controllers.js'
import { verifyAdmin, verifyCustomer } from '../middlewares/verifyUser.js'

const router = express.Router()

router.route('/register/customer')
    .post(registerCustomer)

router.route('/register/admin')
    .post(registerAdmin)

router.route('/addnew')
    .post(verifyAdmin, registerUser)

router.route('/login')
    .post(loginUser)

export default router