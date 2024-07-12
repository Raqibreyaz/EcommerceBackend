import { ApiError } from '../utils/ApiError.js'
import { catchAsyncError } from '../utils/catchAsyncError.js'
import productModel from '../models/product.models.js'
import userModel from '../models/user.models.js'
import { orderModel } from '../models/CartAndOrder.models.js'

const fetchDashBoard = catchAsyncError(async (req, res) => {

    // count all the products
    const totalProducts = await productModel.countDocuments()

    //count all the orders to get the totalSales
    const totalSells = await orderModel.countDocuments()

    // set the start and end of the day to count all the orders within this rang
    const dayStart = new Date().setHours(0, 0, 0, 0)
    const dayEnd = new Date().setHours(23, 59, 59, 999)
    const soldToday = await orderModel.countDocuments({
        createdAt: { $gte: dayStart, $lt: dayEnd }
    })

    // get the recent 5 orders
    const recentOrders = await orderModel.aggregate([
        // we want to show only pending orders on front page
        { $match: { deliveryStatus: "pending" } },
        // take orders on top which are newly created
        { $sort: { createdAt: -1 } },
        // take only 5 orders
        { $limit: 5 },
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
                customer_name: "$customerDetails.fullname",
                totalAmount: 1,
                noOfProducts: { $size: "$products" },
                createdAt: 1,
                _id:1
            }
        }
    ])

    // counting all the sellers
    const totalSellers = await userModel.countDocuments({ role: "seller" })

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthlySellsData = await orderModel.aggregate([
        // take all the orders of this month
        { $match: { createdAt: { $gte: startOfMonth } } },
        // group docs by each day with totalSales
        {
            $group: {
                _id: { $dayOfMonth: "$createdAt" },
                totalSales: { $sum: "$totalAmount" }
            }
        },
        // sort in ascending order
        { $sort: { _id: 1 } }
    ])

    res.status(200).json({
        success: true,
        totalProducts,
        totalSells,
        monthlySellsData,
        totalSellers,
        recentOrders,
        soldToday
    })
}
)

export {
    fetchDashBoard
}