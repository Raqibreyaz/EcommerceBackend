import { cartModel, orderModel } from "../models/CartAndOrder.models";
import { ApiError } from "../utils/ApiError";
import { catchAsyncError } from "../utils/catchAsyncError";
import mongoose from "mongoose";

// create an order
const createOrder = catchAsyncError(async (req, res, next) => {
    //   1. take details from the cart and then clean the cart
    //   2.  take the details via form like cart id products with names, price , discount , quantity , size , color , image

    let {
        cartId,
        products,
        totalPrice,
        totalDiscount,
        totalAmount,
        deliveryAddress
    } = req.body

    // products-->[{product,quantity,size,color,price,discount,image}]

    let newOrder = orderModel.create({
        userId: req.user.id,
        products,
        totalPrice,
        totalDiscount,
        totalAmount,
        deliveryAddress
    })

    await cartModel.findByIdAndUpdate(cartId, {
        $set: { products: [] }
    })

    res.status(200).json({
        success: true,
        message: "order placed successfully"
    })
}
)

const updateOrder = catchAsyncError(async (req, res, next) => {

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

    res.status(200).json({
        success: true,
        message: "order updated successfully"
    })
}
)

const getMyOrders = catchAsyncError(async (req, res, next) => {
    //   id will be provided to get the orders  of the customer
    const userId = req.user.id

    const { page = 1, limit = 10 } = req.query

    const result = await orderModel.aggregate([
        {
            $match: {
                userId
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
        }
    ])



    res.status(200).json({
        success: true,
        message: "orders fetched successfully",
        orders: result
    })

}
)

const getAllOrders = catchAsyncError(async (req, res, next) => {

    const { page = 1, limit = 10 } = req.query

    const result = await orderModel.aggregate([
        { $match: {} },
        { $sort: { updatedAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ])

    console.log(result);

    res.status(200).json({
        success: true,
        message: "orders fetched successfully",
        orders: result
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
    getAllOrders,
    getMyOrders
}