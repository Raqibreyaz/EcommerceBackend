import { catchAsyncError } from '../utils/catchAsyncError.js'
import { checker } from '../utils/objectAndArrayChecker.js'
import { ApiError } from '../utils/ApiError.js'
import messageModel from '../models/message.models.js'

const createMessage = catchAsyncError(async (req, res, next) => {

    if (!checker(req.body, {}, 2))
        throw new ApiError(400, "provide all details to create message")

    const { id: userId } = req.user

    await messageModel.create({
        userId,
        ...req.body
    })

    res.status(200).json({
        success: true,
        message: 'message created sucessfully'
    })
}
)

const fetchMessages = catchAsyncError(async (req, res, next) => {

    const { page = 1, limit = 10 } = req.query

    const result = await messageModel.aggregate([
        {
            $facet: {
                data: [
                    { $match: {} },
                    { $sort: { createdAt: -1 } },
                    { $skip: (parseInt(page) - 1) * parseInt(limit) },
                    { $limit: parseInt(limit) },
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'userId',
                            foreignField: '_id',
                            as: "userDetails"
                        }
                    },
                    { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: 1,
                            subject: 1,
                            description: 1,
                            "userDetails.fullname": 1,
                            "userDetails.email": 1,
                            "userDetails.phoneNo": 1,
                            "userDetails.avatar": 1,
                            'userDetails.address': { $arrayElemAt: ["$userDetails.addresses", 0] },
                            "userDetails.role": 1,
                            createdAt: 1    
                        }
                    }
                ],
                messageCount: [{ $count: 'filteredTotal' }]
            }
        }
    ])

    const { data: messages, messageCount } = result[0]

    const filteredTotal = messageCount.length ? messageCount[0].filteredTotal : 0

    res.status(200).json({
        success: true,
        message: "messages fetched successfully",
        messages,
        filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit)
    })
}
)

export {
    createMessage,
    fetchMessages
}