import { cartModel, orderModel } from "../models/CartAndOrder.models.js";
import { ApiError } from "../utils/ApiError.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import mongoose from "mongoose";
import { checker, checkArrays } from '../utils/objectAndArrayChecker.js'

// create an order 
const createOrder = catchAsyncError(async (req, res, next) => {
    //   1. take details from the cart and then clean the cart
    //   2.  take the details via form like cart id products with names, price , discount , quantity , size , color , image

    let userId = req.user.id

    if (!checker(req.body))
        throw new ApiError(400, "please provide complete details of the order")

    if (checkArrays({ products }))
        throw new ApiError(400, "order should have at least one product")

    let {
        products,
        totalPrice,
        totalDiscount,
        totalAmount,
        deliveryAddress
    } = req.body

    // products-->[{product,product_name,quantity,size,color,price,discount,image}]

    let newOrder = await orderModel.create({
        userId: req.user.id,
        products,
        totalPrice,
        totalDiscount,
        totalAmount,
        deliveryAddress
    })

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

    if (checker({ ...req.body, id: req.params.id }))
        throw new ApiError(400, "provide at least one info of the order")

    const {
        deliveryStatus = '',
        deliveredAt = '',
    } = req.body

    const { id } = req.params

    const order = await orderModel.findById(id)

    if (deliveryStatus) {
        order.deliveryStatus = deliveryStatus
    }

    if (deliveredAt) {
        order.deliveredAt = deliveredAt
    }

    order.save()

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
            $skip: (page - 1) * limit
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
    ])

    res.status(200).json({
        success: true,
        message: "orders fetched successfully",
        orders: result
    })

}
)

const fetchOrderDetails = catchAsyncError(async (req, res, next) => {

    const orderId = req.params.id

    if (orderId)
        throw new ApiError(400, "provide an order id to get details")

    console.log('reached to get details');

    const orderDetails = await orderModel.findById(orderId)

    res.status(200).json({
        success: true,
        message: "order details fetched successfully",
        orderDetails
    })
}
)


const fetchAllOrders = catchAsyncError(async (req, res, next) => {

    const { page = 1, limit = 10 } = req.query

    const orders = await orderModel.aggregate([
        { $match: {} },
        // take orders on top which are newly created and updated previously
        { $sort: { createdAt: -1, updatedAt: 1 } },
        { $skip: (page - 1) * limit },
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
                customer_name: "customerDetails.fullname",
                totalAmount: 1,
                noOfProducts: { $size: "$products" },
                createdAt: 1
            }
        }
    ])

    console.log(result);

    res.status(200).json({
        success: true,
        message: "orders fetched successfully",
        orders
    })
}
)

const changeReturnStatus = catchAsyncError(async (req, res, next) => {
    // this function will be accessed by another fucntion also for changing the status 
    // orderId and productId is required every time

    const orderId = req.order.id
    const productId = req.order.productId
    const status = req.order.status

    const statusObj = {
        'pending': "return pending",
        'approved': 'return approved',
        'rejected': 'return rejected'
    }


    // const updatedOrder = await Order.findOneAndUpdate(
    //     { _id: orderId, 'products.productId': productId },
    //     { $set: { 'products.$.returnStatus': status } },
    //     { new: true }
    // );

    const updatedOrder = await orderModel.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(orderId)
            }
        },
        {
            $unwind: "$products"
        },
        {
            $match: {
                "products.productId": mongoose.Types.ObjectId(productId)
            }
        },
        {
            $set: {
                "products.returnStatus": statusObj[status]
            }
        },
        {
            $group: {
                _id: "$_id",
                products: { $push: "$products" },
                otherFields: { $first: "$$ROOT" } // Include other fields from the root document
            }
        },
        {
            $replaceRoot: {
                newRoot: {
                    $mergeObjects: ["$otherFields", { products: "$products" }]
                }
            }
        }
    ]);

    return;
}
)

export {
    createOrder,
    updateOrder,
    changeReturnStatus,
    fetchAllOrders,
    fetchOrders,
    fetchOrderDetails
}