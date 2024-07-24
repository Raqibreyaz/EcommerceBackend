import express from 'express'
import { verifyAdmin, verifyCustomer } from '../middlewares/verifyUser.js'
import { cancelOrder, createOrder, createRazorPayOrder, fetchAllOrders, fetchOrderDetails, fetchOrders, updateOrder, verifyRazorPayPayment, } from '../controllers/order.controllers.js'
import { createReturnRequest, fetchReturnRequestDetails, fetchReturnRequests, updateReturnRequest } from '../controllers/return.controllers.js'
import { upload } from '../middlewares/upload.middlewares.js'

const router = express.Router()

router.route('/get-orders/all').get(verifyAdmin, fetchAllOrders)

router.route('/update-order/:id').patch(verifyAdmin, updateOrder)

router.route('/get-return-requests').get(verifyAdmin, fetchReturnRequests)

router.route('/get-return-details/:id').get(verifyAdmin,fetchReturnRequestDetails)

router.route('/update-return-request/:id').put(verifyAdmin, updateReturnRequest)

router.use(verifyCustomer)

router.route('/create-razorpay-order').post(createRazorPayOrder)

router.route('/verify-razorpay-payment').post(verifyRazorPayPayment)

router.route('/create-order').post(createOrder)

router.route('/get-orders').get(fetchOrders)

router.route('/get-order-details/:id').get(fetchOrderDetails)

router.route('/cancel-order/:id').put(cancelOrder)

router.route('/create-return-request/:id').post(upload.array('productReturnImages'), createReturnRequest)


export default router