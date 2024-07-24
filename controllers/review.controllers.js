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

    // review stats
    // 5 -->x% of 100%

    if (!checker(req.params, {}, 1))
        throw new ApiError(400, "please provide productId to get reviews")

    const productId = mongoose.Types.ObjectId.createFromHexString(req.params.id)

    const { page = 1, limit = 10, rating } = req.query

    const matchFilter = { productId }

    if (rating)
        matchFilter.rating = { $gte: parseInt(rating) }

    // get all the reveiws of that product
    const result = await reviewModel.aggregate([
        {
            $facet: {
                data: [
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
                        $limit: parseInt(limit)
                    },
                    {
                        $lookup: {
                            from: 'users',
                            localField: "userId",
                            foreignField: "_id",
                            as: "reviewersDetails"
                        }
                    },
                    {
                        $unwind: {
                            path: "$reviewersDetails",
                            preserveNullAndEmptyArrays: true
                        }
                    },
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
                            reviewersDetails: 0,
                            userId:0    
                        }
                    }
                ],
                // get the count of reviews which match the given filter
                filteredTotal: [
                    { $match: matchFilter },
                    { $count: "count" }
                ],
                // an array where each object 
                reviewStats: [
                    { $match: matchFilter },
                    // group documents by their rating
                    {
                        $group: {
                            _id: "$rating",
                            // a counter will be incremented by 1 each time for a document
                            count: { $sum: 1 }
                        }
                    }
                ],
            }
        }

    ])

    let { data: productReviews, reviewStats, filteredTotal } = result[0]

    filteredTotal = filteredTotal.length ? filteredTotal[0].count : 0

    res.status(200).json({
        success: true,
        message: "reviews fetched successfully",
        productReviews,
        reviewStats,
        filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit)
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

export {
    createReview,
    fetchReviews,
    fetchUserReview
}