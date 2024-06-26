import { catchAsyncError } from "../utils/catchAsyncError.js";
import { cartModel } from "../models/CartAndOrder.models.js";
import mongoose from "mongoose";
import productModel from "../models/product.models.js";
import { ApiError } from "../utils/ApiError.js";
import userModel from '../models/user.models.js'

// responsible to add product to cart and update it quantity
const addToCart = catchAsyncError(async (req, res, next) => {

    const { id: userId } = req.user
    let { productId, color, size, quantity } = req.body

    if (!productId || !color || !size || !quantity)
        throw new ApiError(400,"provide full details")

        quantity = parseInt(quantity)

    const product = await productModel.findById(productId)

    if(!product)
        throw new ApiError(404,"product not found!!")

    let availableStocks = 0

    // take available stocks
    let stockCheck = product.stocks.filter((stockObj) => {
        console.log('stock check ', stockObj);
        if (stockObj.color === color && stockObj.size === size) {
            availableStocks = stockObj.stock
            return stockObj.stock >= quantity
        }
        return false
    })

    console.log(stockCheck, availableStocks, quantity);

    // condition when stocks are unavailable
    if (availableStocks <= quantity) {
        let message = "chosen quantity for this size and color is not available"
        throw new ApiError(400, availableStocks !== 0 ? message : "stocks for this color and size not available right now!!")
    }

    const userCart = await cartModel.findOne({ userId })

    let productIndex = userCart.products.findIndex(p => p.product.equals(productId) && p.color === color && p.size === size)

    if (productIndex >= 0) {
        console.log('product already exists increase quantity');
        userCart.products[productIndex].quantity = quantity
    }
    else {

        // first find the doc having that color
        const image = product.colors.filter((productColor) => {
            return productColor.color === color
            // it will return an array we want 0th elem ,it has the images array containing the main image
            // it will return an array we want 0th elem its image keys url has the image url
        })[0].images.filter(image => image.is_main)[0].image.url

        userCart.products.push({
            product: product._id,
            quantity,
            size,
            color,
            image
        })
    }

    await userCart.save()

    res.status(200).json({
        success: true,
        message: "operation successfull",
    })
}
)

// fetching cart by updating if any product not available
const fetchCart = catchAsyncError(async (req, res, next) => {
    const { id: userId } = req.user

    const userCart = await cartModel.findOne({ userId }).lean();

    if (userCart.products.length === 0) {
        res.status(200).json({
            success: true,
            message: "cart fetched successfully",
            userCart: []
        })
    }

    const productIds = userCart.products.map(cp => cp.product.toString());

    // lean makes the doc as plane javascript object
    const products = await productModel.find({ _id: { $in: productIds } }).lean();
    const productMap = {};
    products.forEach(product => {
        productMap[product._id.toString()] = product;
    });

    const ownerIds = products.map(p => p.owner.toString());
    const owners = await userModel.find({ _id: { $in: ownerIds } }).lean();
    const ownerMap = {};
    owners.forEach(owner => {
        ownerMap[owner._id.toString()] = owner;
    });

    let toSave = false;
    // will contain products which are to be removed from the cart
    let discardedProductsIndex = {};
    let cartProducts = [];

    userCart.products.forEach((cartProduct, i) => {
        const product = productMap[cartProduct.product.toString()];

        if (!product) {
            toSave = true;
            discardedProductsIndex[i] = true;
            return;
        }

        // when the size of a product not exists then remove from cart
        const sizeIndex = product.sizes.indexOf(cartProduct.size);
        if (sizeIndex === -1) {
            toSave = true;
            discardedProductsIndex[i] = true;
            return;
        }

        // when the chosen color not exist then remove from cart
        const colorObj = product.colors.find(colorObj => colorObj.color === cartProduct.color);
        if (!colorObj) {
            toSave = true;
            discardedProductsIndex[i] = true;
            return;
        }

        // when stocks are not available then hide the product
        const stockObj = product.stocks.find(stockObj => (
            stockObj.color === cartProduct.color && stockObj.size === cartProduct.size
        ));
        if (!stockObj || stockObj.stock < cartProduct.quantity) {
            return;
        }

        const image = colorObj.images.find(image => image.is_main)?.image.url || '';

        const owner = ownerMap[product.owner.toString()];

        cartProducts.push({
            product_name: product.product_name,
            price: product.price,
            discount: product.discount,
            category: product.category,
            owner: {
                fullname: owner.fullname
            },
            image,
            quantity: cartProduct.quantity,
            product: cartProduct.product,
            size: cartProduct.size,
            color: cartProduct.color
        });
    });

    if (toSave) {
        userCart.products = userCart.products.filter((_, index) => !discardedProductsIndex[index]);
        await userCart.save();
    }

    // const userCart = await cartModel.aggregate([
    //     // Step 1: Match the cart by userId
    //     { $match: { userId: mongoose.Types.ObjectId.createFromHexString(userId) } },
    //     // Step 2: Unwind the products array
    //     { $unwind: "$products" },
    //     // Step 3: Lookup product details from the product collection
    //     {
    //         $lookup: {
    //             from: "products",
    //             localField: "products.product",
    //             foreignField: "_id",
    //             as: "productDetails"
    //         }
    //     },
    //     // Step 4: Unwind the productDetails array
    //     { $unwind: "$productDetails" },
    //     // Step 5: Add product details to the products field
    //     {
    //         $addFields: {
    //             "products.product_name": "$productDetails.product_name",
    //             "products.price": "$productDetails.price",
    //             "products.discount": "$productDetails.discount",
    //             "products.category": "$productDetails.category",
    //             "products.owner": "$productDetails.owner",
    //         }
    //     },
    //     // Step 6: Lookup owner details from the user collection
    //     {
    //         $lookup: {
    //             from: "users",
    //             localField: "products.owner",
    //             foreignField: "_id",
    //             as: "ownerDetails"
    //         }
    //     },
    //     // Step 7: Unwind the ownerDetails array
    //     { $unwind: "$ownerDetails" },
    //     // Step 8: Add owner name to the products field
    //     {
    //         $addFields: {
    //             "products.owner.name": "$ownerDetails.fullname"
    //         }
    //     },
    //     // Step 9: Group back to array format
    //     {
    //         $group: {
    //             _id: "$_id",
    //             userId: { $first: "$userId" },
    //             products: { $push: "$products" }
    //         }
    //     },
    //     // Step 10: Project the final format
    //     {
    //         $project: {
    //             _id: 1,
    //             userId: 1,
    //             products: 1
    //         }
    //     }
    // ]);

    res.status(200).json({
        success: true,
        message: "cart fetched successfully",
        userCart: cartProducts
    })
}
)

// delete a specific product from the cart
const deleteProductFromCart = catchAsyncError(async (req, res, next) => {
    let { id: userId } = req.user
    let { productId, color, size } = req.body

    userId = mongoose.Types.ObjectId.createFromHexString(userId)
    productId = mongoose.Types.ObjectId.createFromHexString(productId)

    // find and remove the product which have the corresponding id,color,size
    const userCart = await cartModel.findOneAndUpdate(
        { userId },
        // remove the object having the product id
        {
            $pull: {
                products: {
                    product: productId,
                    color,
                    size
                }
            }
        },
        // mongo db will return the updated document when new:true else return the doc before which was before the updation
        { new: true })



    res.status(200).json({
        success: true,
        message: "product successfully deleted from cart",
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
