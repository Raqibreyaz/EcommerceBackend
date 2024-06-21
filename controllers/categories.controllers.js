import { catchAsyncError } from "../utils/catchAsyncError.js"
import categoryModel from "../models/category.models.js"
import { ApiError } from "../utils/ApiError.js"

// add a new catgeory 
const addNewCategory = catchAsyncError(async (req, res, next) => {

    const { name } = req.body

    let category = await categoryModel.findOne({ name })

    if (category)
        throw new ApiError(400, 'category already exists')

    category = await categoryModel.create({ name })
    
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

const editCategory = catchAsyncError(async (req, res, next) => {

}
)

const deleteCategory = catchAsyncError(async (req, res, next) => {

}
)
export {
    addNewCategory,
    fetchCategories,
    editCategory,
    deleteCategory
}