import productModel from '../models/product.models.js'
import wishlistModel from '../models/wishlist.models.js'
import { ApiError } from '../utils/ApiError.js'
import { catchAsyncError } from '../utils/catchAsyncError.js'
import { checker } from '../utils/objectAndArrayChecker.js'
import mongoose from 'mongoose'

const addProductToWishlist = catchAsyncError(async (req, res, next) => {

    if (!checker({ ...req.body, id: req.params.id }, {}, 3))
        throw new ApiError(400, "please provide necessary details")

    const productId = mongoose.Types.ObjectId.createFromHexString(req.params.id)

    // image is the url
    const { color, size } = req.body
    const userId = req.user.id

    let wishlist = await wishlistModel.findOne({ userId })

    // there should be only one product of the same id in wishlist
    if (wishlist) {
        const productIndex = wishlist.products.findIndex((wishlistProduct) => wishlistProduct.productId.equals(productId))

        // when the product is present
        if (productIndex !== -1)
            throw new ApiError(400, "product already exists in wishlist")
    }
    // when wishlist not exists then create a new wishlist
    else {
        wishlist = await wishlistModel.create({
            userId,
            products: []
        })
    }

    const product = await productModel.findById(productId)

    // extract the mainimage of that color
    const image = product.colors.find((pcolor) => pcolor.color === color)
        .images.find(colorImage => colorImage.is_main)
        .image.url

    // add the product to wishlist
    wishlist.products.push(
        {
            productId,
            color,
            size,
            image
        }
    )

    await wishlist.save()

    res.status(200).json({
        success: true,
        message: "product is added to wishlist"
    })
}
)

const removeProductFromWishlist = catchAsyncError(async (req, res, next) => {

    if (!checker({ ...req.body, id: req.params.id }, {}, 3))
        throw new ApiError(400, "provide full details")

    const productId = req.params.id
    const { color, size } = req.body
    const userId = req.user.id

    // now find the wishlist of that user
    const result = await wishlistModel.updateOne(
        { userId },
        { $pull: { products: { productId, color, size } } },
        { new: true })

    if (!result.modifiedCount)
        throw new ApiError(404, "product not found in the wishlist")

    res.status(200).json({
        success: true,
        message: "product removed from the wishlist"
    })
}
)

// will fetch the wishlist as well as handles unavailable products 
const fetchWishlist = catchAsyncError(async (req, res, next) => {

    const userId = req.user.id

    const wishlist = await wishlistModel.findOne({ userId })

    let wishlistProducts = []

    if (wishlist && wishlist.products.length) {

        const productIds = wishlist.products.map(({ productId }) => productId)

        // take all the products of the productIds
        let products = await productModel.find({ _id: { $in: productIds } })

        // storing a mapping of each product with its id
        const productMap = {};
        products.forEach(product => {
            productMap[product._id.toString()] = product;
        });

        let discardedProductsIndex = {}
        let toSave = false

        wishlist.products.forEach((wishlistProduct, i) => {
            // getting the product from the mapping via  its id 
            const product = productMap[wishlistProduct.productId.toString()];

            // when the product is deleted 
            if (!product) {
                discardedProductsIndex[i] = true;
                toSave = true
                return;
            }

            // when the size of a product not exists then remove from wishlist
            const sizeIndex = product.sizes.indexOf(wishlistProduct.size);
            if (sizeIndex === -1) {
                discardedProductsIndex[i] = true;
                toSave = true
                return;
            }

            // when the chosen color not exist then remove from cart
            const colorObj = product.colors.find(colorObj => colorObj.color === wishlistProduct.color);
            if (!colorObj) {
                discardedProductsIndex[i] = true;
                toSave = true
                return;
            }

            // take the mainImage of that color
            const image = colorObj.images.find(image => image.is_main)?.image.url || '';

            // taking the final product
            wishlistProducts.push({
                product_name: product.product_name,
                price: product.price,
                discount: product.discount,
                image,
                productId: wishlistProduct.productId,
                size: wishlistProduct.size,
                color: wishlistProduct.color
            });
        });

        // filter out all the products which are no longer available
        if (toSave) {
            wishlist.products = wishlist.products.filter((_, index) => !discardedProductsIndex[index])
            await wishlist.save()
        }
    }

    res.status(200).json({
        success: true,
        message: "wishlist fetched successfully",
        wishlist: wishlistProducts
    })
}
)

const isProductInWishlist = catchAsyncError(async (req, res, next) => {
    if (!checker(req.params, {}, 1))
        throw new ApiError(400, "please provide product id to check presence of product in wishlist")

    const userId = req.user.id
    const productId = req.params.id

    // products is an array containing objects 
    const result = await wishlistModel.findOne({
        userId,
        "products.productId": productId
    })

    res.status(200).json({
        success: true,
        isInWishlist: !!result
    })
}
)

export {
    addProductToWishlist,
    removeProductFromWishlist,
    fetchWishlist,
    isProductInWishlist
}