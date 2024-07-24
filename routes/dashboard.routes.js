import express from 'express'
import { verifyAdmin } from '../middlewares/verifyUser.js'
import { fetchDashBoard } from '../controllers/dashboard.controllers.js'
import { fetchSellers } from '../controllers/user.controllers.js'
import messageRouter from './message.routes.js'

const router = express.Router()

router.use(verifyAdmin)

router.use('/messages', messageRouter)

router.route('/')
    .get(verifyAdmin, fetchDashBoard)

router.route('/get-sellers')
    .get(verifyAdmin, fetchSellers)

export default router