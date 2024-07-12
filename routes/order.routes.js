import express from 'express'
import { verifyAdmin, verifyCustomer } from '../middlewares/verifyUser.js'
import { createOrder, createRazorPayOrder, fetchAllOrders, fetchOrderDetails, fetchOrders, updateOrder, verifyRazorPayPayment, } from '../controllers/order.controllers.js'

const router = express.Router()

router.route('/get-orders/all').get(verifyAdmin, fetchAllOrders)
router.route('/update-order').patch(verifyAdmin, updateOrder)

router.use(verifyCustomer)

router.route('/create-razorpay-order').post(createRazorPayOrder)

router.route('/verify-razorpay-payment').post(verifyRazorPayPayment)

router.route('/create-order').post(createOrder)

router.route('/get-orders').get(fetchOrders)

router.route('/get-order-details/:id').get(fetchOrderDetails)


export default router