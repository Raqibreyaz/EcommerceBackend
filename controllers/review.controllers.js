import mongoose from "mongoose";
import reviewModel from "../models/review.models.js";
import { ApiError } from "../utils/ApiError.js";
import { catchAsyncError } from "../utils/catchAsyncError.js";
import { checker } from '../utils/objectAndArrayChecker.js'

const createReview = catchAsyncError(async (req, res, next) => {

    if (!checker({ ...req.params, ...req.body }, {}, 4))
        throw new ApiError(400, "please provide all necessary details")

    const userId = req.user.id
    const productId = req.params.id
    const { oneWord, review, rating } = req.body
    
    await reviewModel.findOneAndUpdate(
        { userId, productId },
        { userId, productId, oneWord, rating, review },
        { new: true, upsert: true }
    )

    res.status(200).json({
        success: true,
        message: "review created successfully",
    })
}
)

// fetch reviews through product id
const fetchReviews = catchAsyncError(async (req, res, next) => {

    if (!checker(req.params, {}, 1))
        throw new ApiError(400, "please provide productId to get reviews")

    const productId = mongoose.Types.ObjectId.createFromHexString(req.params.id)

    const { page = 1, limit = 10, rating } = req.query

    const matchFilter = { productId }

    if (rating)
        matchFilter.rating = { $gte: parseInt(rating) }

    // get all the reveiws of that product
    const result = await reviewModel.aggregate([
        // take all the reviews which match the filter
        {
            $match: matchFilter,
        },
        // sorting reviews based on rating and newest first
        {
            $sort: { createdAt: -1, rating: -1 }
        },
        {
            $skip: (parseInt(page) - 1) * parseInt(limit)
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: 'users',
                localField: "userId",
                foreignField: "_id",
                as: "reviewersDetails"
            }
        },
        { $unwind: "$reviewersDetails" },
        {
            $addFields: {
                user: {
                    fullname: "$reviewersDetails.fullname",
                    _id: "$reviewersDetails._id",
                    avatar: "$reviewersDetails.avatar",
                    address: {
                        $arrayElemAt: ["$reviewersDetails.addresses", 0]
                    }
                }
            }
        },
        {
            $project: {
                productId: 0,
                reviewersDetails: 0
            }
        }
    ])

    res.status(200).json({
        success: true,
        message: "reviews fetched successfully",
        reviews: result
    })

})

const fetchUserReview = catchAsyncError(async (req, res, next) => {

    if (!checker(req.params, {}, 1))
        throw new ApiError(400, "provide product id to fetch user review")


    const { id: userId } = req.user
    const { id: productId } = req.params

    const review = await reviewModel.findOne({ productId, userId })

    console.log(review);

    res.status(200).json({
        success: true,
        message: "user review fetched successfully",
        userReview: review ?? {}
    })
}
)

// edit review using review id
const editReview = catchAsyncError(async (req, res, next) => {

    if (!checker({ ...req.body, ...req.params }, {}, 4))
        throw new ApiError(400, "please provide all necessary details")

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
    editReview,
    fetchUserReview
}