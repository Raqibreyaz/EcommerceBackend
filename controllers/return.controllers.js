import { ApiError } from "../utils/ApiError.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import { changeReturnStatus } from "./order.controllers.js";
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import returnModel from "../models/return.models.js";
import { checker } from "../utils/objectAndArrayChecker.js";
import mongoose from "mongoose";
import productModel from "../models/product.models.js";
import { converter } from "../utils/converter.js";

// takes the order id for creating return request
const createReturnRequest = catchAsyncError(async (req, res, next) => {

    if (!checker({ ...req.body, ...req.params }, { toReplace: true }, 7))
        throw new ApiError(400, "provide all details to create return request")

    const userId = req.user.id

    const orderId = req.params.id

    // productId will be the unique _id in the array of products in the order  
    let {
        productId,
        color,
        size,
        quantity,
        refundAmount,
        reason,
        toReplace = false,
        pickupAddress
    } = converter(req.body,true)

    // check for images provided
    if (req.files.length < 3 || req.files.length > 5) {
        throw new ApiError(400, "only 3 to 5 images required")
    }

    const product = await productModel.findById(productId)

    if (!product.isReturnable)
        throw new ApiError(400, "product is not returnable, sorry!")

    // // take the image path upload it on cloudinary and push object {url,public_id} into images
    const images = []
    for (const { path } of req.files) {
        const cloudinaryResponse = await uploadOnCloudinary(path)
        images.push({ url: cloudinaryResponse.url, public_id: cloudinaryResponse.public_id })
    }

    await returnModel.create({
        productId,
        color,
        size,
        userId,
        quantity,
        refundAmount: refundAmount * quantity,
        orderId,
        images,
        reason,
        toReplace,
        pickupAddress,
    })

    req.order = {
        id: orderId,
        productId,
        color,
        size,
        status: 'pending'
    }

    await changeReturnStatus(req, res, next)

    res.status(200).json({
        success: true,
        message: "return request successfully submitted"
    })
}
)

// only takes the status of return request
const updateReturnRequest = catchAsyncError(async (req, res, next) => {

    if (!checker({ ...req.body, ...req.params }, {}, 2))
        throw new ApiError(400, "provide all necessary details update the return request")

    // return request id
    const { id } = req.params

    const { status } = req.body

    const updatedReturnRequest = await returnModel.findByIdAndUpdate(
        id,
        { $set: { status } },
        { new: true }
    );

    req.order = {
        id: updatedReturnRequest.orderId,
        productId: updatedReturnRequest.productId,
        color: updatedReturnRequest.color,
        size: updatedReturnRequest.size,
        status
    }

    await changeReturnStatus(req, res, next)

    res.status(200).json({
        success: true,
        message: "return request updated successfully"
    })
}
)

const fetchReturnRequests = catchAsyncError(async (req, res, next) => {

    const { page = 1, limit = 10 } = req.query

    const result = await returnModel.aggregate([
        {
            $facet: {
                data: [
                    { $match: {} },
                    // taking the newest first and which are updated previously
                    { $sort: { createdAt: -1, updatedAt: 1 } },
                    { $skip: (parseInt(page) - 1) * parseInt(limit) },
                    { $limit: parseInt(limit) },
                    {

                        $lookup: {
                            from: "users",
                            localField: "userId",
                            foreignField: "_id",
                            as: 'customerDetails'
                        }
                    },
                    {
                        $lookup: {
                            from: "products",
                            localField: "productId",
                            foreignField: "_id",
                            as: 'productDetails'
                        }
                    },
                    { $unwind: "$productDetails" },
                    { $unwind: "$customerDetails" },
                    {
                        $project: {
                            _id: 1,
                            orderId: 1,
                            customer_name: "$customerDetails.fullname",
                            createdAt: 1,
                            status: 1,
                            product_name: "$productDetails.product_name",
                            images: 1,
                            quantity: 1,
                            refundAmount: 1
                        }
                    }
                ],
                metadata: [
                    { $count: 'totalItems' }
                ],
            }
        }
    ])

    const { data: returnRequests, metadata } = result[0]

    const filteredTotal = metadata.length ? metadata[0].totalItems : 0
    const totalPages = Math.ceil(filteredTotal / limit)

    res.status(200).json({
        success: true,
        message: "return requests fetched successfully",
        returnRequests,
        filteredTotal,
        totalPages
    })
}
)

const fetchReturnRequestDetails = catchAsyncError(async (req, res, next) => {

    if (!checker(req.params, {}, 1))
        throw new ApiError(400, "please provide return request id to continue")

    const returnDetails = await returnModel.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId.createFromHexString(req.params.id)
            }
        },
        {

            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: 'customerDetails'
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: 'productDetails'
            }
        },
        { $unwind: "$productDetails" },
        { $unwind: "$customerDetails" },
        {
            $project: {
                orderId: 1,
                "customerDetails.avatar": 1,
                "customerDetails.fullname": 1,
                "customerDetails.phoneNo": 1,
                "customerDetails.email": 1,
                pickupAddress: 1,
                createdAt: 1,
                status: 1,
                "productDetails.product_name": 1,
                "productDetails.returnPolicy": 1,
                "productDetails.isReturnable": 1,
                images: 1,
                quantity: 1,
                refundAmount: 1,
                toReplace: 1,
                reason: 1
            }
        }
    ])

    res.status(200).json({
        success: true,
        message: "return details fetched successfully",
        returnDetails: returnDetails[0]
    })
}
)

export {
    createReturnRequest,
    updateReturnRequest,
    fetchReturnRequests,
    fetchReturnRequestDetails
}