import { catchAsyncError } from "../utils/catchAsyncError.js";
import { cartModel } from "../models/CartAndOrder.models.js";
import mongoose from "mongoose";
import productModel from "../models/product.models.js";
import { ApiError } from "../utils/ApiError.js";
import { checkArrays, checker } from '../utils/objectAndArrayChecker.js'
import userModel from '../models/user.models.js'

// responsible to add product to cart and update it quantity
const addToCart = catchAsyncError(async (req, res, next) => {

    const { id: userId } = req.user
    let { productId, color, size, quantity } = req.body

    if (!checker({ ...req.body }))
        throw new ApiError(400, "provide full details")

    quantity = parseInt(quantity)

    const product = await productModel.findById(productId)

    if (!product)
        throw new ApiError(404, "product not found!!")

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

    // get the cart of the user via userId
    const userCart = await cartModel.findOne({ userId });

    let cartProducts = [];

    // the operations will be done when there is a cart and it has products
    if (userCart && userCart.products.length > 0) {

        // lean makes the doc as plane javascript object

        // get all the product ids in an array
        const productIds = userCart.products.map(cp => cp.product.toString());

        // take all the products in an array through their ids
        const products = await productModel.find({ _id: { $in: productIds } }).lean();

        // will map each id with the product
        const productMap = {};
        products.forEach(product => {
            productMap[product._id.toString()] = product;
        });

        // extracting all the owners ids
        const ownerIds = products.map(p => p.owner.toString());

        // finding owners through ids
        const owners = await userModel.find({ _id: { $in: ownerIds } }).lean();

        // mapping every owner with id
        const ownerMap = {};
        owners.forEach(owner => {
            ownerMap[owner._id.toString()] = owner;
        });


        let toSave = false;
        // will contain products which are to be removed from the cart
        let discardedProductsIndex = {};

        userCart.products.forEach((cartProduct, i) => {
            // getting the product from the mapping via  its id 
            const product = productMap[cartProduct.product.toString()];

            // when the product is deleted 
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
    }

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

    if (!checker({ ...req.body }))
        throw new ApiError(400, "please provide full details")

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
