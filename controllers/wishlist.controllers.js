import productModel from '../models/product.models.js'
import wishlistModel from '../models/wishlist.models.js'
import { catchAsyncError } from '../utils/catchAsyncError.js'

const addProductToWishlist = catchAsyncError(async (req, res, next) => {

    const productId = req.params.id
    // image is the url
    const { color, size, image } = req.body
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
        $push: {
            products: {
                productId,
                color,
                size,
                image
            }
        }
    }, { upsert: true })

    res.status(200).json({
        success: true,
        message: "product is added to wishlist"
    })
}
)

const removeProductFromWishlist = catchAsyncError(async (req, res, next) => {

    const productId = req.params.id
    const { color, size } = req.body
    const userId = req.user.id

    // now find the wishlist of that user
    const wishlist = await wishlistModel.updateOne(
        { userId },
        { $pull: { products: { productId, color, size } } },
        { new: true })

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
                description: product.description,
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

export {
    addProductToWishlist,
    removeProductFromWishlist,
    fetchWishlist
}