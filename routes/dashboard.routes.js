import express from 'express'
import { verifyAdmin } from '../middlewares/verifyUser.js'
import { fetchDashBoard } from '../controllers/dashboard.controllers.js'
import { changeUserRole, fetchSellers, findUser } from '../controllers/user.controllers.js'
import messageRouter from './message.routes.js'

const router = express.Router()

router.use(verifyAdmin)

router.use('/messages', messageRouter)

router.route('/')
    .get(fetchDashBoard)

router.route('/get-sellers')
    .get(fetchSellers)

router.route('/find-user')
    .post(findUser)

router.route('/change-user-role')
    .put(changeUserRole)

export default router