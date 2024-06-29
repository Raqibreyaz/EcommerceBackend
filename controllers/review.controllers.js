import mongoose from "mongoose";
import reviewModel from "../models/review.models.js";
import { ApiError } from "../utils/ApiError.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";

const createReview = catchAsyncError(async (req, res, next) => {
    const userId = req.user.id
    const productId = req.params.id
    const { oneWord, review, rating } = req.body

    if (!productId || !review || !rating || !oneWord)
        throw new ApiError(400, "please provide full details")

    const newReview = reviewModel.create({
        userId,
        productId,
        review,
        rating,
        oneWord
    })

    res.status(200).json({
        success: true,
        message: "review created successfully",
    })
}
)

const fetchReviews = catchAsyncError(async (req, res, next) => {

    const productId = req.params.id
    const { page = 1, limit = 10 } = req.query

    // get all the reveiws of that product
    const result = await reviewModel.aggregate([
        {
            $match: {
                productId,
            },
        },
        // sorting reviews based on rating and newest first
        {
            $sort: { createdAt: -1, rating: -1 }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        },
        {
            $project: {
                productId: 0,
                userId: 0
            }
        }
    ])

    res.status(200).json({
        success: true,
        message: "reviews fetched successfully",
        reviews: result.length === 0 ? [] : result
    })

})

const editReview = catchAsyncError(async (req, res, next) => {
    const userId = req.user.id
    const { oneWord, review, rating } = req.body
    const reviewId = req.params.id

    // find the review  in the user reviewed on that product
    const result = await reviewModel.aggregate([
        {
            // take that particular review of that user
            $match: {
                userId: mongoose.Types.ObjectId.createFromHexString(userId),
                _id: reviewId
            }
        },
        {
            $set: {
                review,
                rating,
                oneWord
            }
        }
    ])

    // when the review does not belongs to the user or user not have reviewed yet
    if (!result.length)
        throw new ApiError(404, "user review not found")

    res.status(200).json({
        success: true,
        message: "review updated successfully",
    })
}
)

export {
    createReview,
    fetchReviews,
    editReview
}