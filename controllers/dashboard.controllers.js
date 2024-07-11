import { ApiError } from '../utils/ApiError.js'
import { catchAsyncError } from '../utils/catchAsyncError.js'
import productModel from '../models/product.models.js'
import userModel from '../models/user.models.js'
import { orderModel } from '../models/CartAndOrder.models.js'

const fetchDashBoard = catchAsyncError(async (req, res) => {

    // count all the products
    const totalProducts = productModel.countDocuments()

    //count all the orders to get the totalSales
    const totalSells = orderModel.countDocuments()

    // set the start and end of the day to count all the orders within this rang
    const dayStart = new Date().setHours(0, 0, 0, 0)
    const dayEnd = new Date().setHours(23, 59, 59, 999)
    const soldToday = orderModel.countDocuments({
        createdAt: { $gte: dayStart, $lt: dayEnd }
    })

    // get the recent 5 orders
    const recentOrders = orderModel.aggregate([
        // get all the orders
        { $match: {} },
        // sort with recent orders
        { $sort: { createdAt: -1 } },
        { $limit: 5 }
    ])

    // counting all the sellers
    const totalSellers = orderModel.countDocuments({ role: "seller" })

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthlySellsData = orderModel.aggregate([
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
        { $sort: 1 }
    ])

    res.status(200).json({
        success: true,
        totalProducts,
        totalSells,
        monthlySellsData,
        totalSellers,
        recentOrders
    })
}
)

export {
    fetchDashBoard
}