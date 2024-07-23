import { cartModel, orderModel } from "../models/CartAndOrder.models.js";
import { ApiError } from "../utils/ApiError.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import mongoose from "mongoose";
import { checker, checkArrays } from '../utils/objectAndArrayChecker.js'
import { instance } from '../server.js'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

// Razorpay {
//     key_id: '',
//     key_secret: '',
//     api: API {
//       version: 'v1',
//       rq: [Function: wrap] {
//         constructor: [Function: wrap],
//         request: [Function: wrap],
//         _request: [Function: wrap],
//         getUri: [Function: wrap],
//         delete: [Function: wrap],
//         get: [Function: wrap],
//         head: [Function: wrap],
//         options: [Function: wrap],
//         post: [Function: wrap],
//         postForm: [Function: wrap],
//         put: [Function: wrap],
//         putForm: [Function: wrap],
//         patch: [Function: wrap],
//         patchForm: [Function: wrap],
//         defaults: [Object],
//         interceptors: [Object],
//         create: [Function: create]
//       }
//     },
//     accounts: {
//       create: [Function: create],
//       edit: [Function: edit],
//       fetch: [Function: fetch],
//       delete: [Function: _delete],
//       uploadAccountDoc: [Function: uploadAccountDoc],
//       fetchAccountDoc: [Function: fetchAccountDoc]
//     },
//     stakeholders: {
//       create: [Function: create],
//       edit: [Function: edit],
//       fetch: [Function: fetch],
//       all: [Function: all],
//       uploadStakeholderDoc: [Function: uploadStakeholderDoc],
//       fetchStakeholderDoc: [Function: fetchStakeholderDoc]
//     },
//     payments: {
//       all: [Function: all],
//       fetch: [Function: fetch],
//       capture: [Function: capture],
//       createPaymentJson: [Function: createPaymentJson],
//       createRecurringPayment: [Function: createRecurringPayment],
//       edit: [Function: edit],
//       refund: [Function: refund],
//       fetchMultipleRefund: [Function: fetchMultipleRefund],
//       fetchRefund: [Function: fetchRefund],
//       fetchTransfer: [Function: fetchTransfer],
//       transfer: [Function: transfer],
//       bankTransfer: [Function: bankTransfer],
//       fetchCardDetails: [Function: fetchCardDetails],
//       fetchPaymentDowntime: [Function: fetchPaymentDowntime],
//       fetchPaymentDowntimeById: [Function: fetchPaymentDowntimeById],
//       otpGenerate: [Function: otpGenerate],
//       otpSubmit: [Function: otpSubmit],
//       otpResend: [Function: otpResend],
//       createUpi: [Function: createUpi],
//       validateVpa: [Function: validateVpa],
//       fetchPaymentMethods: [Function: fetchPaymentMethods]
//     },
//     refunds: {
//       all: [Function: all],
//       edit: [Function: edit],
//       fetch: [Function: fetch]
//     },
//     orders: {
//       all: [Function: all],
//       fetch: [Function: fetch],
//       create: [Function: create],
//       edit: [Function: edit],
//       fetchPayments: [Function: fetchPayments],
//       fetchTransferOrder: [Function: fetchTransferOrder],
//       viewRtoReview: [Function: viewRtoReview],
//       editFulfillment: [Function: editFulfillment]
//     },
//     customers: {
//       create: [Function: create],
//       edit: [Function: edit],
//       fetch: [Function: fetch],
//       all: [Function: all],
//       fetchTokens: [Function: fetchTokens],
//       fetchToken: [Function: fetchToken],
//       deleteToken: [Function: deleteToken],
//       addBankAccount: [Function: addBankAccount],
//       deleteBankAccount: [Function: deleteBankAccount],
//       requestEligibilityCheck: [Function: requestEligibilityCheck],
//       fetchEligibility: [Function: fetchEligibility]
//     },
//     transfers: {
//       all: [Function: all],
//       fetch: [Function: fetch],
//       create: [Function: create],
//       edit: [Function: edit],
//       reverse: [Function: reverse],
//       fetchSettlements: [Function: fetchSettlements]
//     },
//     tokens: {
//       create: [Function: create],
//       fetch: [Function: fetch],
//       delete: [Function: _delete],
//       processPaymentOnAlternatePAorPG: [Function: processPaymentOnAlternatePAorPG]
//     },
//     virtualAccounts: {
//       all: [Function: all],
//       fetch: [Function: fetch],
//       create: [Function: create],
//       close: [Function: close],
//       fetchPayments: [Function: fetchPayments],
//       addReceiver: [Function: addReceiver],
//       allowedPayer: [Function: allowedPayer],
//       deleteAllowedPayer: [Function: deleteAllowedPayer]
//     },
//     invoices: {
//       create: [Function: create],
//       edit: [Function: edit],
//       issue: [Function: issue],
//       delete: [Function: _delete],
//       cancel: [Function: cancel],
//       fetch: [Function: fetch],
//       all: [Function: all],
//       notifyBy: [Function: notifyBy]
//     },
//     iins: { fetch: [Function: fetch], all: [Function: all] },
//     paymentLink: {
//       create: [Function: create],
//       cancel: [Function: cancel],
//       fetch: [Function: fetch],
//       all: [Function: all],
//       edit: [Function: edit],
//       notifyBy: [Function: notifyBy]
//     },
//     plans: {
//       create: [Function: create],
//       fetch: [Function: fetch],
//       all: [Function: all]
//     },
//     products: {
//       requestProductConfiguration: [Function: requestProductConfiguration],     
//       edit: [Function: edit],
//       fetch: [Function: fetch],
//       fetchTnc: [Function: fetchTnc]
//     },
//     subscriptions: {
//       create: [Function: create],
//       fetch: [Function: fetch],
//       update: [Function: update],
//       pendingUpdate: [Function: pendingUpdate],
//       cancelScheduledChanges: [Function: cancelScheduledChanges],
//       pause: [Function: pause],
//       resume: [Function: resume],
//       deleteOffer: [Function: deleteOffer],
//       all: [Function: all],
//       cancel: [Function: cancel],
//       createAddon: [Function: createAddon],
//       createRegistrationLink: [Function: createRegistrationLink]
//     },
//     addons: {
//       fetch: [Function: fetch],
//       delete: [Function: _delete],
//       all: [Function: all]
//     },
//     settlements: {
//       createOndemandSettlement: [Function: createOndemandSettlement],
//       all: [Function: all],
//       fetch: [Function: fetch],
//       fetchOndemandSettlementById: [Function: fetchOndemandSettlementById],     
//       fetchAllOndemandSettlement: [Function: fetchAllOndemandSettlement],       
//       reports: [Function: reports]
//     },
//     qrCode: {
//       create: [Function: create],
//       all: [Function: all],
//       fetchAllPayments: [Function: fetchAllPayments],
//       fetch: [Function: fetch],
//       close: [Function: close]
//     },
//     fundAccount: { create: [Function: create], fetch: [Function: fetch] },      
//     items: {
//       all: [Function: all],
//       fetch: [Function: fetch],
//       create: [Function: create],
//       edit: [Function: edit],
//       delete: [Function: _delete]
//     },
//     cards: {
//       fetch: [Function: fetch],
//       requestCardReference: [Function: requestCardReference]
//     },
//     webhooks: {
//       create: [Function: create],
//       edit: [Function: edit],
//       all: [Function: all],
//       fetch: [Function: fetch],
//       delete: [Function: _delete]
//     },
//     documents: { create: [Function: create], fetch: [Function: fetch] },        
//     disputes: {
//       fetch: [Function: fetch],
//       all: [Function: all],
//       accept: [Function: accept],
//       contest: [Function: contest]
//     }
//   }

// {
//     "success": true,
//     "order": {
//         "amount": 50000,
//         "amount_due": 50000,
//         "amount_paid": 0,
//         "attempts": 0,
//         "created_at": 1720802125,
//         "currency": "INR",
//         "entity": "order",
//         "id": "order_OXmxdifFN0bmCR",
//         "notes": [],
//         "offer_id": null,
//         "receipt": null,
//         "status": "created"
//     }
// }

const createRazorPayOrder = catchAsyncError(async (req, res, next) => {

    if (!checker(req.body, {}, 2))
        throw new ApiError(400, "provide necessary details to initiate order")

    const { customer_name, amount } = req.body
    const { id: customerId } = req.user.id


    const order = await instance.orders.create({
        amount: parseInt(amount) * 100,
        currency: "INR",
        receipt: `receipt_${uuidv4().slice(0, 5)}`,
        notes: {
            customerId,
            customer_name,
        }
    })

    order.RAZORPAY_KEY = process.env.RAZORPAY_KEY

    res.status(200).json({
        success: true,
        order,
        message: "razorpay order created successfully"
    })
}
)

const verifyRazorPayPayment = catchAsyncError(async (req, res, next) => {

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    console.log(req.body);

    // Verify payment signature (implementation of verifyRazorpaySignature not shown)
    const isPaymentValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (isPaymentValid) {
        res.status(201).json({
            success: true,
            isPaymentVerified: isPaymentValid
        });
    } else {
        throw new ApiError(400, 'Invalid payment signature')
    }

    function verifyRazorpaySignature(orderId, paymentId, signature) {

        // the razorpay signature is also created using the hmac with sha256 hashing algorithm by concatenating orderid and paymentid with |

        const secret = process.env.RAZORPAY_SECRET;

        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(orderId + '|' + paymentId);

        // convert the hmac into readable hex string
        const generatedSignature = hmac.digest('hex');

        // when both strings match then it is verified
        return generatedSignature === signature;
    };
})

// create an order 
const createOrder = catchAsyncError(async (req, res, next) => {
    //   1. take details from the cart and then clean the cart
    //   2.  take the details via form like cart id products with names, price , discount , quantity , size , color , image

    let userId = req.user.id

    // req.body-->products[],paymentDetails{},deliveryAddress{},totalPrice,totalAmount,totalDiscount

    // checking if all the required details are provided
    if (!checker(req.body, {}, 6))
        throw new ApiError(400, "please provide complete details of the order")

    // checking if all the required payment details are provided
    if (!checker(req.body.paymentDetails, { razorpayOrderId: true, razorpayPaymentId: true }, 2))
        throw new ApiError(400, "provide necessary payment details")

    // checking if address is provided
    if (!checker(req.body.deliveryAddress, {}, 4))
        throw new ApiError(400, "provide necessary payment details")

    // checking if there is at least one product present 
    if (checkArrays({ products: req.body.products }) === 'products')
        throw new ApiError(400, "order should have at least one product")

    // products-->[{product,product_name,quantity,size,color,price,discount,image}]

    await orderModel.create({
        userId: req.user.id,
        ...req.body
    })

    // clear the cart when an order is placed successfully
    await cartModel.findOneAndUpdate({ userId }, {
        $set: { products: [] }
    })

    res.status(200).json({
        success: true,
        message: "order placed successfully"
    })
}
)

const updateOrder = catchAsyncError(async (req, res, next) => {

    if (!checker({ ...req.body, id: req.params.id }, { deliveredAt: true }, 2))
        throw new ApiError(400, "provide necessary info of the order")

    const {
        deliveryStatus,
    } = req.body

    const order = await orderModel.findById(req.params.id)

    order.deliveryStatus = deliveryStatus

    if (deliveryStatus === 'delivered')
        order.deliveredAt = Date.now()

    await order.save()

    res.status(200).json({
        success: true,
        message: "order updated successfully"
    })
}
)

const fetchOrders = catchAsyncError(async (req, res, next) => {
    //   id will be provided to get the orders  of the customer
    const userId = req.user.id

    const { page = 1, limit = 10 } = req.query

    const result = await orderModel.aggregate([
        {
            $facet: {
                data: [
                    {
                        $match: {
                            userId: mongoose.Types.ObjectId.createFromHexString(userId)
                        },
                    },
                    {
                        $sort: {
                            updatedAt: -1
                        }
                    },
                    {
                        $skip: (parseInt(page) - 1) * parseInt(limit)
                    },
                    {
                        $limit: limit
                    },
                    {
                        $project: {
                            totalAmount: 1,
                            createdAt: 1,
                            deliveryStatus: 1,
                            deliveredAt: 1,
                            "products.image": 1,
                            "products.returnStatus": 1,
                            "products.product": 1
                        }
                    }
                ],
                metadata: [
                    { $count: 'totalItems' }
                ],
            }
        }

    ])

    const { data: orders, metadata } = result[0]

    const filteredTotal = metadata.length ? metadata[0].totalItems : 0
    const totalPages = Math.ceil(filteredTotal / limit)

    res.status(200).json({
        success: true,
        message: "orders fetched successfully",
        orders,
        totalPages
    })

}
)

const fetchOrderDetails = catchAsyncError(async (req, res, next) => {

    if (!checker(req.params, {}, 1))
        throw new ApiError(400, "provide an order id to get details")

    const orderDetails = await orderModel.findById(req.params.id)

    res.status(200).json({
        success: true,
        message: "order details fetched successfully",
        orderDetails
    })
}
)

const cancelOrder = catchAsyncError(async (req, res, next) => {

    if (!checker(req.params, {}, 1))
        throw new ApiError(400, 'provide order id to cancel order')

    const {
        deliveryStatus,
    } = req.body

    const order = await orderModel.findById(req.params.id)

    const currentDate = new Date()
    const givenDate = new Date(order.createdAt)

    const millisecondDiff = currentDate - givenDate

    const hoursDifference = millisecondDiff / 1000 * 60 * 60

    if (hoursDifference >= 3)
        throw new ApiError(400, "cannot cancel after 3 hours")

    order.deliveryStatus = 'cancelled'

    await order.save()

    res.status(200).json({
        success: true,
        message: "order cancelled successfully"
    })

}
)

const fetchAllOrders = catchAsyncError(async (req, res, next) => {

    const { page = 1, limit = 15 } = req.query

    const result = await orderModel.aggregate([
        {
            $facet: {
                data: [
                    { $match: {} },
                    // take orders on top which are newly created and updated previously
                    { $sort: { createdAt: -1, updatedAt: 1 } },
                    { $skip: (parseInt(page) - 1) * parseInt(limit) },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userId",
                            foreignField: "_id",
                            as: 'customerDetails'
                        }
                    },
                    { $unwind: "$customerDetails" },
                    {
                        $project: {
                            deliveryStatus: 1,
                            customer_name: "$customerDetails.fullname",
                            totalAmount: 1,
                            noOfProducts: { $size: "$products" },
                            createdAt: 1,
                            _id: 1
                        }
                    }
                ],
                metadata: [
                    { $count: 'totalItems' }
                ],
            }
        }
    ])

    const { data: orders, metadata } = result[0]

    const filteredTotal = metadata.length ? metadata[0].totalItems : 0
    const totalPages = Math.ceil(filteredTotal / limit)

    res.status(200).json({
        success: true,
        message: "orders fetched successfully",
        orders,
        filteredTotal
    })
}
)

const changeReturnStatus = catchAsyncError(async (req, res, next) => {
    // this function will be accessed by another fucntion also for changing the status 
    // orderId and productId is required every time

    if (!checker(req.order, {}, 5))
        throw new ApiError(400, "provide necessary details to change return status")

    const { id: orderId, productId, color, size, status } = req.order

    const statusObj = {
        'pending': "return pending",
        'approved': 'return approved',
        'rejected': 'return rejected'
    }

    // The $ positional operator is used to refer to the first array element that matches the query.
    const result = await orderModel.updateOne(
        {
            _id: orderId,
            'products.product': productId,
            'products.color': color,
            'products.size': size
        },
        { $set: { 'products.$.returnStatus': statusObj[status] } },
    );
    console.log(result);
}
)

export {
    createOrder,
    updateOrder,
    changeReturnStatus,
    fetchAllOrders,
    fetchOrders,
    fetchOrderDetails,
    cancelOrder,
    createRazorPayOrder,
    verifyRazorPayPayment
}