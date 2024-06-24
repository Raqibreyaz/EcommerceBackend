import reviewModel from "../models/review.models.js";
import { ApiError } from "../utils/ApiError";
import { catchAsyncError } from "../utils/catchAsyncError.js";

const createReview = catchAsyncError(async (req, res, next) => {
    const userId = req.user.id
    const productId = req.params.id
    const { oneWord, review, rating } = req.body

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
        review: newReview
    })
}
)

const getReviews = catchAsyncError(async (req, res, next) => {

    const productId = req.params.id
    const { page = 1, limit = 10 } = req.query

    // get all the reveiws of that product
    const result = await reviewModel.aggregate([
        {
            $match: {
                productId,
            },
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
        message: "reviews fetched successfully",
        reviews: result.length === 0 ? [] : result
    })

})

const updateReview = catchAsyncError(async (req, res, next) => {
    const userId = req.user.id
    const { oneWord, review, rating } = req.body
    const productId = req.params.id

    // find the review  in the user reviewed on that product
    const result = await reviewModel.aggregate([
        {
            $match: {
                userId,
                productId
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

    if (!result.length)
        throw new ApiError(404, "user review not found")

    res.status(200).json({
        success: true,
        message: "review updated successfully",
        review: result[0]
    })
}
)

export {
    createReview,
    getReviews,
    updateReview
}