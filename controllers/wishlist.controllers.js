import wishlistModel from '../models/wishlist.models.js'
import { catchAsyncError } from '../utils/catchAsyncError.js'

const addProductToWishlist = catchAsyncError(async (req, res, next) => {

    const productId = req.params.id
    const userId = req.user.id

    // let wishlist = await wishlistModel.findOne({ userId })
    // if (!wishlist)
    //     wishlist = await wishlistModel.create({
    //         userId,
    //         products: []
    //     })
    // wishlist.products.push(productId)
    // await wishlist.save()

    let wishlist = await wishlistModel.updateOne({ userId }, {
        // create a wishlist if no wishlist is found
        $setOnInsert: { userId, products: [] },
        // push the id to the wishlist products
        $push: { products: productId }
    }, { upsert: true })

    res.status(200).json({
        success: true,
        message: "product is added to wishlist"
    })
}
)

const removeProductFromWishlist = catchAsyncError(async (req, res, next) => {

    const productId = req.params.id
    const userId = req.user.id

    // now find the wishlist of that user
    const wishlist = await wishlistModel.updateOne({ userId }, {
        $pull: {
            products: productId
        }
    }, { new: true })

    res.status(200).json({
        success: true,
        message: "product removed from the wishlist"
    })
}
)

export {
    addProductToWishlist,
    removeProductFromWishlist
}