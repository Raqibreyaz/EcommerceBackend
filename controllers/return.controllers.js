import { ApiError } from "../utils/ApiError.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import { changeReturnStatus } from "./order.controllers.js";
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import returnModel from "../models/return.models.js";
import { checker } from "../utils/objectAndArrayChecker.js";

const createReturnRequest = catchAsyncError(async (req, res, next) => {

    if (!checker({ ...req.body, ...req.params }, { toReplace: true }, 4))
        throw new ApiError(400, "provide all details to create return request")

    const userId = req.user.id

    const orderId = req.params.id

    const {
        productId,
        reason,
        toReplace = false,
        pickupAddress
    } = req.body

console.log(req.files);

    if (req.files.length < 3 || req.files.length > 5) {
        throw new ApiError(400, "only 3 to 5 images required")
    }

    const images = []
    for (const { path } of req.files.productReturnImages) {
        const cloudinaryResponse = await uploadOnCloudinary(path)
        images.push(cloudinaryResponse.url)
    }

    pickupAddress = JSON.parse(pickupAddress)

    const returnRequest = await returnModel.create({
        productId,
        userId,
        orderId,
        reason,
        pickupAddress,
        toReplace,
        images
    })

    req.order = {
        id: orderId,
        productId,
        status: 'return pending'
    }

    await changeReturnStatus(req, res, next)

    res.status(200).json({
        success: true,
        message: "return request successfully submitted"
    })
}
)

const updateReturnRequest = catchAsyncError(async (req, res, next) => {

    // return request id
    const { id } = req.params

    const { orderId, productId, status } = req.body

    const updatedReturnRequest = await returnModel.findByIdAndUpdate(
        id,
        { $set: { status } }
    );

    req.order = {
        id: orderId,
        productId,
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

    const returnRequests = await returnModel.aggregate([
        { $match: {} },
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
        {},
        {
            $project: {
                _id: 1,
                customer_name: "customerDetails.fullname",
                createdAt: 1,
                status: 1,
                product_name: "productDetails.product_name",
                refundAmount: 1
            }
        }
    ])

    res.status(200).json({
        success: true,
        message: "return requests fetched successfully",
        returnRequests
    })
}
)

export {
    createReturnRequest,
    updateReturnRequest,
    fetchReturnRequests
}