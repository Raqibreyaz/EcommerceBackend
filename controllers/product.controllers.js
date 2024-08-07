import { catchAsyncError } from '../utils/catchAsyncError.js'
import productModel from '../models/product.models.js'
import { ApiError } from '../utils/ApiError.js'
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import categoryModel from '../models/category.models.js'
import reviewModel from '../models/review.models.js'
import { checkArrays, checker } from '../utils/objectAndArrayChecker.js'
import mongoose from 'mongoose'
import { converter } from '../utils/converter.js'
import { uploadAndStore } from '../utils/uploadAndStore.js'

// this function just adds a new product 
const addNewProduct = catchAsyncError(async (req, res, next) => {

    if (!checker(req.body, { isReturnable: true, discount: true }, 11))
        throw new ApiError(400, "provide full info of the product")

    const toCreate = converter(req.body, true, { isReturnable: true, discount: 0 })

    let {
        keyHighlights, //array of  highlight
        colors, //just an array of colors
        sizes, //array of sizes
        stocks,//array of stocks,
    } = toCreate;

    let arrayCheck = checkArrays({ colors, keyHighlights, sizes, stocks, images: req.files })
    if (arrayCheck !== true)
        throw new ApiError(400, `${arrayCheck} are required!!`)

    let productCategory = await categoryModel.findOne({ name: toCreate.category.toLowerCase() })
    if (!productCategory) {
        throw new ApiError(404, "category does not exist")
    }

    // newImages:{0:[{image:{url,public_id},is_main:boolean}]}]
    const [newImages, thumbnail] = await uploadAndStore(req.files)

    // newColors:[{color:'',images:[{}]}]
    const newColors = integrateImages(colors, newImages)

    let owner = req.user.id

    await productModel.create({
        ...toCreate,
        thumbnail,
        owner,
        colors: newColors,
    })

    res.status(200).json({
        success: true,
        message: 'product created successfully',
    })
}
)

// this function is responsible for pagination,sorting,filtering 
const fetchProducts = catchAsyncError(async (req, res, next) => {

    // const products = await productModel.find({}).limit(limit).skip((page - 1) * limit)

    let { page = 1, limit = 10, category, min_discount, product_owners, min_price, max_price, rating, sort } = converter(req.query);

    // limit = 2

    const pipeline = [];

    // Match stage to filter products based on provided criteria
    const matchStage = {};

    // Add a new stage to calculate the resultant price
    pipeline.push({
        $addFields: {
            resultantPrice: {
                $subtract: [
                    "$price",
                    { $multiply: ["$price", { $divide: ["$discount", 100] }] }
                ]
            }
        }
    });

    // if category is given for filtering then filter by category
    if (category) {
        // { category: 'sarees,kurti' }
        // $in will get an array containing string separated by ,
        matchStage.category = { $in: category.split(',') };
    }

    // if productOwners is given for filtering then filter by productOwners
    if (product_owners) {
        const productOwners = product_owners.split(',').map((ownerId) => mongoose.Types.ObjectId.createFromHexString(ownerId))
        // { category: 'sarees,kurti' }
        // $in will get an array containing string separated by ,
        matchStage.owner = { $in: productOwners };
    }

    // if price is given for filtering then filter by price
    if (min_price) {
        const obj = { $gte: min_price }
        if (max_price) obj.$lte = max_price
        matchStage.resultantPrice = obj;
    }

    if (min_discount) {
        matchStage.discount = { $gte: min_discount }
    }

    // if rating is given for filtering then filter by rating
    if (rating) {
        matchStage.rating = { $gte: rating };
    }

    // filter out the documents having no stocks
    matchStage.totalStocks = { $gt: 0 }

    // the match stage is looking like this
    // {
    //     category: { $in: ['sarees', 'kurti'] },
    //     price: { $gte: 50, $lte: 200 },
    //     discount: { $gte: 10 },
    //     owner: mongoose.Types.ObjectId('60d0fe4f5311236168a109ca'),
    //     rating: { $gte: 4 },
    //     totalStocks: { $gt: 0 }
    //   }      

    pipeline.push({ $match: matchStage })

    if (sort) {
        const sortFields = converter(sort, false, { rating: -1, price: 1 })

        if (sortFields.price) {
            sortFields.resultantPrice = sortFields.price
            delete sortFields.price
        }
        //{rating:-1,price:1}
        pipeline.push({ $sort: sortFields });
    }

    pipeline.push({
        // facet runs the two pipelines parellely data and filteredTotal
        $facet: {
            data: [
                // will skip previous products --> for 11 to 20 , skip 1 to 10
                { $skip: (page - 1) * limit },
                // only take 10 products
                { $limit: limit },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'owner',
                        foreignField: '_id',
                        as: 'owner'
                    }
                },
                {
                    $unwind: '$owner'
                },
                {
                    $project: {
                        _id: 1,
                        product_name: 1,
                        price: 1,
                        discount: 1,
                        'thumbnail.url': 1,
                        'owner.fullname': 1,
                        'owner._id': 1,
                        rating: 1,
                        totalStocks: 1,
                        category: 1
                    }
                }
            ],
            // will count the documents which match the filter criteria
            metadata: [
                {
                    $match: matchStage
                },
                { $count: 'totalItems' }
            ],
            overallTotal: [
                { $count: 'count' }
            ]
        }
    });

    // sort[rating]=desc&&sort[price]=desc
    // sort: { rating: 'desc', price: 'desc' } 


    // {
    //     rating: -1,
    //     price: 1
    //   }


    // pipeline.push({
    //     $sort: {  price: -1 }
    // })

    // Execute the aggregation pipeline
    const result = await productModel.aggregate(pipeline)

    let { data: products, metadata, overallTotal } = result[0]

    const filteredTotal = metadata.length ? metadata[0].totalItems : 0;
    overallTotal = overallTotal.length ? overallTotal[0].count : 0;

    res.status(200).json({
        products,
        filteredTotal,
        overallTotal,
        totalPages: Math.ceil(filteredTotal / limit),
    });
})

const fetchProductDetails = catchAsyncError(async (req, res, next) => {

    // take the product id from params
    const { id } = req.params

    if (!checker(req.params, {}, 1))
        throw new ApiError(400, "please provide an id")

    const product = await productModel.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId.createFromHexString(id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: [
                        {
                            $map: {
                                input: "$ownerDetails",
                                as: "ownerDetail",
                                in: {
                                    fullname: "$$ownerDetail.fullname",
                                    _id: "$$ownerDetail._id"
                                }
                            }
                        },
                        0
                    ]
                }
            }
        },
        {
            $project: {
                price: 1,
                discount: 1,
                description: 1,
                colors: 1,
                sizes: 1,
                stocks: 1,
                rating: 1,
                details: 1,
                isReturnable: 1,
                returnPolicy: 1,
                totalStocks: 1,
                product_name: 1,
                keyHighlights: 1,
                owner: 1,
                category: 1,
                thumbnail: 1
            }
        }
    ]);

    res.status(200).json({
        success: true,
        product: product[0]
    })
}
)

const editProduct = catchAsyncError(async (req, res, next) => {

    // price,discount,totalStocks,sizes,keyHighlights,stocks

    if (!req.params.id)
        throw new ApiError(400, "provide product id to update product")

    if (!checker(req.body, {}, 1))
        throw new ApiError(400, "provide something to update")

    await productModel.findByIdAndUpdate(req.params.id, { $set: converter(req.body, false, { isReturnable: true }) })

    res.status(200).json({
        success: true,
        message: "product updated successfully"
    })
}
)

const editColorAndImages = catchAsyncError(async (req, res, next) => {

    if (!checker({ ...req.body, ...req.params }, { thumbnail: true }, 3))
        throw new ApiError(400, "provide full info of the product")

    const toCreate = converter(req.body, true)

    const {
        colors, //just an array of colors
        stocks,//array of stocks,
        totalStocks
    } = toCreate;

    let arrayCheck = checkArrays({ colors, stocks })
    if (arrayCheck !== true)
        throw new ApiError(400, `${arrayCheck} are required!!`)

    const product = await productModel.findById(req.params.id)

    if (!product)
        throw new ApiError(404, "product not found")

    // files
    // colors
    // stocks
    const findColor = {} //[color]:true
    const findImage = {} //[public_id]:true
    let toBeDeletedImages = []

    // populate the findColor and findImage objects to query in O(1)
    colors.forEach(({ color, images, mainImage }) => {

        findColor[color] = true

        if (mainImage)
            findImage[mainImage.public_id] = true

        images.forEach(({ public_id }) => {
            findImage[public_id] = true
        })
    });

    // filter out all the removed colors and take the images to remove
    product.colors = product.colors.filter(({ color, images }) => {

        // when the color is removed then take its images to delete
        if (!findColor[color]) {
            toBeDeletedImages = [...toBeDeletedImages, ...images.map(
                ({ image: { public_id } }) => public_id)]
        }
        return findColor[color] ? true : false
    })

    // filter out all the removed images and take the removed ones to remove
    // it can be a main image
    product.colors = product.colors.map(({ color, images }) => (
        {
            color,
            images: images.filter(({ image: { public_id } }) => {

                // when image is not removed then take it
                if (findImage[public_id])
                    return true

                // otherwise push it to delete and dont take it
                toBeDeletedImages.push(public_id)

                return false
            })
        }
    ))

    // {0:[{image:{url,public_id},is_main:boolean}]}
    const [newImages, thumbnail] = await uploadAndStore(req.files ? req.files : [])

    if (thumbnail) {
        product.thumbnail = thumbnail
    }

    // update stocks
    product.stocks = stocks

    // update  totalStocks
    product.totalStocks = totalStocks

    // integrate all the new images
    product.colors = integrateImages(product.colors, newImages)

    // delete all the removed images 
    for (const public_id of toBeDeletedImages) {
        await deleteFromCloudinary(public_id)
    }

    // finally save the updated product
    await product.save()

    res.status(200).json({
        success: true,
        message: 'colors edited successfully'
    })
}
)

const addNewColors = catchAsyncError(async (req, res, next) => {

    if (!checker({ ...req.body, ...req.params }, {}, 4))
        throw new ApiError(400, "provide all the details")

    const toAdd = converter(req.body, true)

    // colors:['']
    const { colors, stocks, totalStocks } = toAdd

    let checkArray = checkArrays({ colors, stocks, images: req.files ? req.files : [] })
    if (checkArray !== true)
        throw new ApiError(400, `please provide some ${checkArray} to continue`)

    const [providedImages] = await uploadAndStore(req.files)

    const newColors = integrateImages(colors, providedImages)

    const product = await productModel.findById(req.params.id)
    if (!product)
        throw new ApiError(400, "product not found")

    // integrate stocks and colors
    product.stocks = [...product.stocks, ...stocks]
    product.colors = [...product.colors, ...newColors]
    product.totalStocks += totalStocks

    await product.save()

    res.status(200).json({
        success: true, message: "colors added successfully"
    })
}
)

const deleteProduct = catchAsyncError(async (req, res, next) => {

    let productId = req.params.id

    if (!productId)
        throw new ApiError(400, "provide an id to delete")

    let product = await productModel.findById(productId)

    // product.reviews [] of object ids

    let result = await reviewModel.deleteMany({ productId })

    let deleteResponse = await deleteFromCloudinary(product.thumbnail.public_id)

    for (const { images } of product.colors) {
        for (const { image } of images) {
            let deleteResponse = await deleteFromCloudinary(image.public_id)
        }
    }

    let deletedProduct = await findOneAndDelete({ _id: productId })

    res.status(200).json({
        success: true,
        message: 'product deleted successfully'
    })
}
)

function integrateImages(colors, newImages) {
    // the colors array can be empty
    let result = []

    if (colors.length > 0 && typeof colors[0] === 'string') {
        result = colors.map((color, colorIndex) => ({
            color,
            images: images[colorIndex]
        }))
    }
    else if (colors.length > 0 && typeof colors[0] === 'object') {
        result = colors.map(({ color, images }, colorIndex) => (
            {
                color,
                // take the previous images and all the new provided images
                images: [...images, ...(newImages[colorIndex] ? newImages[colorIndex] : [])]
            }))
    }

    return result
}

export {
    addNewProduct,
    fetchProducts,
    editProduct,
    deleteProduct,
    fetchProductDetails,
    editColorAndImages,
    addNewColors
}