import { ApiError } from "../utils/ApiError.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import { changeReturnStatus } from "./order.controllers.js";
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import returnModel from "../models/return.models.js";
import { checker } from "../utils/objectAndArrayChecker.js";

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
    } = req.body

    console.log(req.body);

    if (req.files.length < 3 || req.files.length > 5) {
        throw new ApiError(400, "only 3 to 5 images required")
    }

    // // take the image path upload it on cloudinary and push object {url,public_id} into images
    const images = []
    for (const { path } of req.files) {
        console.log(path);
        const cloudinaryResponse = await uploadOnCloudinary(path)
        images.push({ url: cloudinaryResponse.url, public_id: cloudinaryResponse.public_id })
    }

    // // pickup address will be a json string parse it into json object
    pickupAddress = JSON.parse(pickupAddress)

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