import express from 'express'
import { verifyAdmin, verifyCustomer } from '../middlewares/verifyUser.js'
import { createOrder, fetchAllOrders, fetchOrders, updateOrder } from '../controllers/orders.controllers.js'

const router = express.Router()

router.route('/create-order').post(verifyCustomer, createOrder)

router.route('/update-order').patch(verifyAdmin, updateOrder)

router.route('/get-orders').get(verifyCustomer, fetchOrders)

router.route('/get-orders/all').get(verifyAdmin, fetchAllOrders)

export default router