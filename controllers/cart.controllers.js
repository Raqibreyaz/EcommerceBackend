import { catchAsyncError } from "../utils/catchAsyncError.js";
import { cartModel } from "../models/CartAndOrder.models.js";
import mongoose from "mongoose";
import productModel from "../models/product.models.js";
import { ApiError } from "../utils/ApiError.js";

// responsible to add product to cart and update it quantity
const addToCart = catchAsyncError(async (req, res, next) => {

    const { id: userId } = req.user;
    const { id: productId } = req.params;

    // there can be more than one same products so it will be differentiated by color,size
    let { quantity, size, color } = req.body;

    let message = "product updated successfully"

    // check if we have required stocks available
    let product = await productModel.findById(productId)
    let colorObj = product.sizes.find(sizeObj => sizeObj.size === size).colors.find(colorObj => colorObj.color === color)
    if (colorObj.stocks < quantity)
        throw new ApiError(400, `sorry we have only ${colorObj.stocks} stocks left`)

    // Try to update the quantity of the product if it exists in the cart
    let result = await cartModel.findOneAndUpdate(
        // By specifying "products.productId": productId, you are telling MongoDB to find documents where there exists at least one element in the products array with a productId field equal to the provided productId value.
        { userId, "products.product": productId, "products.color": color, "products.size": size },
        // $ is the searched element having the productId , so we increment its quantity
        { $set: { "products.$.quantity": quantity } },
        { new: true }
    )

    // If the product doesn't exist in the cart, add it
    if (!result) {
        result = await cartModel.findOneAndUpdate(
            // find the cart and add it 
            { userId },
            // push the product if it is not in the cart
            { $push: { products: { product: productId, quantity, size, color } } },
            { new: true, upsert: true }
        );
        message = "product successfully added to cart"
    }

    res.status(200).json({
        success: true,
        message,
        cart: result
    })
}
)

const updateProductFromCart = catchAsyncError(async (req,res,next) => {
  
}
)

const fetchCart = catchAsyncError(async (req, res, next) => {
    const { id: userId } = req.user

    const userCart = await cartModel.aggregate([
        // Step 1: Match the cart by userId
        { $match: { userId: mongoose.Types.ObjectId.createFromHexString(userId) } },
        // Step 2: Unwind the products array
        { $unwind: "$products" },
        // Step 3: Lookup product details from the product collection
        {
            $lookup: {
                from: "products",
                localField: "products.product",
                foreignField: "_id",
                as: "productDetails"
            }
        },
        // Step 4: Unwind the productDetails array
        { $unwind: "$productDetails" },
        // Step 5: Add product details to the products field
        {
            $addFields: {
                "products.product_name": "$productDetails.product_name",
                "products.price": "$productDetails.price",
                "products.discount": "$productDetails.discount",
                "products.category": "$productDetails.category",
                "products.owner": "$productDetails.owner",
                // TODO: to be removed in future
                "products.image": "$productDetails.thumbnail"
            }
        },
        // Step 6: Lookup owner details from the user collection
        {
            $lookup: {
                from: "users",
                localField: "products.owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        // Step 7: Unwind the ownerDetails array
        { $unwind: "$ownerDetails" },
        // Step 8: Add owner name to the products field
        {
            $addFields: {
                "products.owner.name": "$ownerDetails.fullname"
            }
        },
        // Step 9: Group back to array format
        {
            $group: {
                _id: "$_id",
                userId: { $first: "$userId" },
                products: { $push: "$products" }
            }
        },
        // Step 10: Project the final format
        {
            $project: {
                _id: 1,
                userId: 1,
                products: 1
            }
        }
    ]);

    res.status(200).json({
        success: true,
        message: "cart fetched successfully",
        cart: userCart.length ? userCart[0] : {}
    })
}
)

// delete a specific product from the cart
const deleteProductFromCart = catchAsyncError(async (req, res, next) => {
    let { id: userId } = req.user
    let { id: productId } = req.params

    userId = mongoose.Types.ObjectId.createFromHexString(userId)
    productId = mongoose.Types.ObjectId.createFromHexString(productId)

    const userCart = await cartModel.findOneAndUpdate(
        { userId },
        // remove the object having the product id
        {
            $pull: {
                products: {
                    product: productId
                }
            }
        },
        // mongo db will return the updated document when new:true else return the doc before which was before the updation
        { new: true })

    res.status(200).json({
        success: true,
        message: "product successfully deleted from cart",
        cart: userCart
    })
}
)

const fetchNoOfItems = catchAsyncError(async (req, res, next) => {
    const { id: userId } = req.user
    let noOfItems = await cartModel.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId.createFromHexString(userId)
            },
        },
        { $unwind: "$products" },
        { $count: "count" }
    ])

    res.status(200).json({
        success: true,
        message: "no. of items in cart fetched successfully",
        noOfItems: noOfItems[0]?.count || 0
    })

}
)

export {
    addToCart,
    fetchCart,
    deleteProductFromCart,
    fetchNoOfItems
}
