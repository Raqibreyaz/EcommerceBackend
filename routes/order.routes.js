import express from 'express'
import { verifyAdmin, verifyCustomer } from '../middlewares/verifyUser.js'
import { createOrder, getAllOrders, getMyOrders, updateOrder } from '../controllers/orders.controllers.js'

const router = express.Router()

router.route('/create-order').post(verifyCustomer, createOrder)

router.route('/update-order').patch(verifyAdmin, updateOrder)

router.route('/get-orders').get(verifyCustomer, getMyOrders)

router.route('/get-orders/all').get(verifyAdmin, getAllOrders)
