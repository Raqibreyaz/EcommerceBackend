import { catchAsyncError } from "../utils/catchAsyncError"
import categoryModel from "../models/category.models"
// add a new catgeory 
const addNewCategory = catchAsyncError(async (req, res, next) => {

    const { name } = req.body

    const category = await categoryModel.create({ name })

    res.status(200).json({
        success: true,
        message: 'category created successfully',
        category
    })
}
)


const fetchCategories = catchAsyncError(async (req, res, next) => {
    const categories = await categoryModel.find({})
    res.status(200).json({
        success: true,
        message: "categories fetched successfully",
        categories
    })
}
)

export {
    addNewCategory,
    fetchCategories
}