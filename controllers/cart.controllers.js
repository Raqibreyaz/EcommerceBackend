import { catchAsyncError } from "../utils/catchAsyncError";
import { cartModel } from "../models/CartAndOrder.models";

// responsible to add product to cart and update it quantity
const addToCart = catchAsyncError(async (req, res, next) => {

    const { id: userId } = req.user;
    const { id: productId } = req.params;
    const { quantity } = req.body;

    // Try to increment the quantity of the product if it exists in the cart
    let result = await cartModel.findOneAndUpdate(

        // By specifying "products.productId": productId, you are telling MongoDB to find documents where there exists at least one element in the products array with a productId field equal to the provided productId value.
        { userId, "products.product": productId },
        // $ is the searched element having the productId , so we increment its quantity
        { $inc: { "products.$.quantity": quantity } },
        { new: true }
    );

    // If the product doesn't exist in the cart, add it
    if (!result) {
        result = await cartModel.findOneAndUpdate(
            { userId },
            { $addToSet: { products: { product: productId, quantity } } },
            { new: true, upsert: true }
        );
    }

    res.status(200).json({
        success: true,
        message: "product successfully added to cart",
        cart: result
    })
}
)

const fetchCart = catchAsyncError(async (req, res, next) => {
    const { id: userId } = req.user

    // const userCart = await cartModel.aggregate([
    //     {
    //         $match: {
    //             userId:mongoose.Types.ObjectId(userId)
    //         },

    //     }
    // ])

    const userCart = await cartModel.aggregate([
        // Step 1: Match the cart by userId
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
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
                "products.owner": "$productDetails.owner"
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
                "products.owner_name": "$ownerDetails.name"
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
                _id: 0,
                userId: 1,
                products: 1
            }
        }
    ]);


    res.status(200).json({
        success: true,
        message: "cart fetched successfully",
        cart: userCart
    })
}
)

// delete a specific product from the cart
const deleteProductFromCart = catchAsyncError(async (req, res, next) => {
    const { id: userId } = req.user
    const { id: productId } = req.params

    const userCart = await cartModel.findOneAndUpdate([
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
        { new: true }
    ])

    res.status(200).json({
        success: true,
        message: "product successfully deleted from cart",
        cart: userCart
    })
}
)

export {
    addToCart,
    fetchCart,
    deleteProductFromCart
}
