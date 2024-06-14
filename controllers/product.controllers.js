import { catchAsyncError } from '../utils/catchAsyncError.js'
import productModel from '../models/product.models.js'
import imageModel from '../models/image.models.js'
import { ApiError } from '../utils/ApiError.js'
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import categoryModel from '../models/category.models.js'
import { cartModel } from '../models/CartAndOrder.models.js'
import mongoose from 'mongoose'
import { application } from 'express'

// images  [Object: null prototype] {
//     thumbnail: [
//       {
//         fieldname: 'thumbnail',
//         originalname: 'Screenshot 2024-04-26 225656.png',
//         encoding: '7bit',
//         mimetype: 'image/png',
//         destination: './tmp',
//         filename: '1717275922976-699220111.png',     
//         path: 'tmp\\1717275922976-699220111.png',    
//         size: 700807
//       }
//     ],
//     images: [
//       {
//         fieldname: 'images',
//         originalname: 'Screenshot 2024-04-26 225656.png',
//         encoding: '7bit',
//         mimetype: 'image/png',
//         destination: './tmp',
//         filename: '1717275922983-990014186.png',     
//         path: 'tmp\\1717275922983-990014186.png',    
//         size: 700807
//       },
//       {
//         fieldname: 'images',
//         originalname: 'Screenshot 2024-04-26 225656.png',
//         encoding: '7bit',
//         mimetype: 'image/png',
//         destination: './tmp',
//         filename: '1717275922988-750792570.png',     
//         path: 'tmp\\1717275922988-750792570.png',    
//         size: 700807
//       }
//     ]
//   }

// this function just adds a new product 
const addNewProduct = catchAsyncError(async (req, res, next) => {

    // taking all the provided text data
    let {
        product_name,
        price,
        isReturnable = true, //can be a string
        returnPolicy,
        totalStocks,
        discount,
        description,
        category,
        keyHighlights, //array of  highlight
        colors, //just an array of colors
        sizes, //array of sizes
        details,
        stocks,
    } = req.body;


    keyHighlights = JSON.parse(keyHighlights)
    sizes = JSON.parse(sizes)
    stocks = JSON.parse(stocks)
    colors = JSON.parse(colors)
    isReturnable = Boolean(isReturnable)
    // [{color:'',images:[{image:imagePath,is_main}]}]
    colors = colors.map((color, index) => {
        // is an array containing images path and is_main for that color
        let images = req.files.filter((file) => file.fieldname.includes(`colors[${index}]`))
            .map((file) => {
                if (file.fieldname.includes('mainImage')) {
                    return {
                        image: file.path,
                        is_main: true
                    }
                }
                return {
                    image: file.path,
                    is_main: false
                }
            })

        return {
            color,
            images
        }
    })
    keyHighlights = keyHighlights.map(({ highlight }) => highlight)

    sizes = sizes.map(({ size }) => size)

    let thumbnail = ''

    for (const image of req.files) {
        if (image.fieldname === 'thumbnail') {
            thumbnail = image
            break;
        }
    }

    console.log(thumbnail);
    console.log(req.files);

    const thumbnailRes = await uploadOnCloudinary(thumbnail.path)

    // const newThumbnail = await imageModel.create({
    //     url: thumbnailRes.url,
    //     public_id: thumbnailRes.public_id
    // })

    // take the given category first

    let productCategory = await categoryModel.findOne({ name: category.toLowerCase() })
    if (!productCategory) {
        throw new ApiError(404, "category does not exist")
    }

    let owner = req.user.id

    console.log(owner);

    const product = await productModel.create({
        product_name,
        price,
        isReturnable, //can be a string
        returnPolicy,
        totalStocks,
        thumbnail: newThumbnail._id,
        discount,
        description,
        category,
        keyHighlights,
        sizes,
        owner,
        details,
        stocks,
    })

    let newColors = []
    // take the color and its images
    for (const { color, images } of colors) {
        let newImages = []
        // take the image and is_main boolean
        for (const { image, is_main } of images) {
            // take the image ,upload on cloudinary , create a new imagedoc and append it in newImages
            let cloudinaryResponse = await uploadOnCloudinary(image)
            // let newImage = await imageModel.create({
            //     url: cloudinaryResponse.url,
            //     public_id: cloudinaryResponse.public_id
            // })

            newImages.push({
                image: {
                    url: cloudinaryResponse.url,
                    
                },
                is_main
            })
        }

        newColors.push({ color, images: newImages })
    }

    product.colors = newColors

    // finally save the product
    await product.save()

    res.status(200).json({
        success: true,
        message: 'product created successfully',
        product
    })
}
)

// this function is responsible for pagination,sorting,filtering 
const fetchProducts = catchAsyncError(async (req, res, next) => {

    // { page: '1', limit: '10', category: 'price,rating' }

    // const products = await productModel.find({}).limit(limit).skip((page - 1) * limit)

    const { page = 1, limit = 10, category, min_discount, owner, min_price, max_price, rating, sort_by, order = 'asc' } = req.query;

    console.log(req.query);

    const pipeline = [];

    // Match stage to filter products based on provided criteria
    const matchStage = {};

    // if category is given for filtering then filter by category
    if (category) {
        matchStage.category = { $in: category.split(',') };
    }

    // if price is given for filtering then filter by price
    if (min_price && max_price) {
        matchStage.price = { $gte: parseInt(min_price), $lte: parseInt(max_price) };
    }

    if (min_discount) {
        matchStage.discount = { $gte: parseInt(min_discount) }
    }

    // owner must be the id
    if (owner) {
        matchStage.owner = mongoose.Types.ObjectId.createFromHexString(owner)
    }

    // if rating is given for filtering then filter by rating
    if (rating) {
        matchStage.rating = { $gte: parseInt(rating) };
    }

    // so filter all the documents that matches the given criteria
    // pipeline.push({ $match: matchStage });

    // Facet stage for pagination and filtered total count
    pipeline.push({
        // facet runs the two pipelines parellely data and filteredTotal
        $facet: {
            data: [
                { $match: matchStage },
                // will skip previous products --> for 11 to 20 , skip 1 to 10
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
                // only take 10 products
                { $limit: parseInt(limit) },
                {
                    $lookup: {
                        from: 'images',
                        localField: 'thumbnail',
                        foreignField: '_id',
                        as: 'thumbnail'
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'owner',
                        foreignField: '_id',
                        as: 'owner'
                    }
                },
                {
                    $unwind: '$thumbnail'
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
            filteredTotal: [
                { $match: matchStage },
                // the result on counting the documents will be an object having key count and value is the result 
                { $count: 'count' }
            ],
            total: [
                { $count: 'count' }
            ]
        }
    });

    // Sort stage
    if (sort_by && order) {
        // when order is not given that descending
        pipeline.push({ $sort: { [sort_by]: order === 'asc' ? 1 : -1 } });
    }


    // Execute the aggregation pipeline
    const result = await productModel.aggregate(pipeline)

    // get all the products
    const products = result[0].data;
    const filteredTotal = result[0].filteredTotal.length ? result[0].filteredTotal[0].count : 0;
    const overallTotal = result[0].total.length ? result[0].total[0].count : 0;

    // Get approximate total count using $collStats
    // const overallTotal = await productModel.countDocuments()

    res.json({
        products,
        filteredTotal,
        overallTotal,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredTotal / limit)
    });
})

const fetchProductDetails = catchAsyncError(async (req, res, next) => {

    // TODO: consider related products

    // take the product id from params
    const { id } = req.params

    const product = await productModel.aggregate(
        [
            {
                $match: {
                    _id: mongoose.Types.ObjectId.createFromHexString(id)
                }
            },
            {
                $lookup: {
                    from: "images",
                    localField: "colors.images.image",
                    foreignField: "_id",
                    as: "imageDetails"
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
                $lookup: {
                    from: "reviews",
                    localField: "reviews",
                    foreignField: "_id",
                    as: "productReviews"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "productReviews.userId",
                    foreignField: "_id",
                    as: "reviewers"
                }
            },
            {
                $lookup: {
                    from: 'images',
                    localField: "reviewers.avatar",
                    foreignField: "_id",
                    as: "reviewersImages",
                }
            },
            {
                $addFields: {
                    colors: {
                        $map: {
                            input: "$colors",
                            as: "color",
                            in: {
                                color: "$$color.color",
                                images: {
                                    $map: {
                                        input: "$$color.images",
                                        as: "imageObj",
                                        in: {
                                            image: {
                                                // taking 0th element from the returned array
                                                $arrayElemAt: [
                                                    {
                                                        // finding the populated image which have the given id
                                                        $map: {
                                                            input: "$imageDetails",
                                                            as: "imageDetail",
                                                            in: {
                                                                $cond: {
                                                                    if: { eq: ["$$imageDetail._id", "$$imageObj.image"] },
                                                                    then: {
                                                                        _id: "$$imageDetail._id",
                                                                        url: "$$imageDetail.url"
                                                                    },
                                                                    else: null
                                                                }
                                                            },
                                                        }
                                                    }, {
                                                        $indexOfArray: ["$imageDetails._id", "$$imageObj.image"]
                                                    }
                                                ]
                                            },
                                            is_main: "$$imageObj.is_main"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    reviews: {
                        $map: {
                            input: "$productReviews",
                            as: "review",
                            in: {
                                user: {
                                    $arrayElemAt: [
                                        {
                                            $map: {
                                                input: "$reviewers",
                                                as: "reviewer",
                                                in: {
                                                    $cond: {
                                                        if: { $eq: ["$$reviewer._id", "$$review.userId"] },
                                                        then: {
                                                            fullname: "$$reviewer.fullname",
                                                            avatar: {
                                                                $arrayElemAt: [
                                                                    {
                                                                        $filter: {
                                                                            input: "$reviewersImages",
                                                                            as: "reviewerImage",
                                                                            cond: { $eq: ["reviewer.avatar", "reviewerImage._id"] }
                                                                        }
                                                                    }
                                                                    , 0]
                                                            },
                                                        },
                                                        else: null
                                                    }
                                                }
                                            }
                                        },
                                        {
                                            $indexOfArray: ["$reviewers._id", "$$review.userId"]
                                        }
                                    ]
                                },
                                oneWord: "$$review.oneWord",
                                review: "$$review.review",
                                rating: "review.rating"
                            }
                        }
                    },
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
                            }
                            , 0]
                    }
                }
            },
            {
                $project: {
                    reviewersImages: 0,
                    reviewers: 0,
                    imageDetails: 0,
                    productReviews: 0,
                    ownerDetails: 0,
                    thumbnail: 0
                }
            }
        ]
    );

    res.status(200).json({
        success: true,
        product: product[0]
    })
}
)

// TODO: reconsider the logic of this function
const editProduct = catchAsyncError(async (req, res, next) => {

    // updating stocks
    // updating images
    // deescription,price,discount,product_name,category,colors,details,keyHighlights

    const { id: productId } = req.params

    let {
        product_name,
        price,
        discount,
        description,
        category,
        colors,
        sizes,
        details,
        keyHighlights,
        stocks,
        //imageIds of every image associated to the product to be deleted
        imageIds = [],
        // ids of products []
        relatedProducts = []
    } = req.body

    // thumbnail have the imageId of the thumbnail
    let thumbnail = ''

    // images will have the image path so that upload on cloudinary
    let images = []

    // if the thumbnail is provided then upload on cloudinary and create the imageModel
    if (req.files && req.files.thumbnail.length) {

        thumbnail = req.files.thumbnail[0].path;

        //upload 
        let response = await uploadOnCloudinary(thumbnail)
        // create image model
        thumbnail = await imageModel.create({ url: response.url, public_id: response.public_id, productId })._id
    }

    let newImages = []
    // if the images are provided then upload on cloudinary and create the imageModel
    if (req.files && req.files.images.length) {
        images = req.files.images.map(image => image.path)

        for (const image of images) {
            //upload 
            let response = await uploadOnCloudinary(image)
            // create image model
            let imageDoc = await imageModel.create({ url: response.url, public_id: response.public_id, productId })

            // psuh the id of the image document
            newImages.push(imageDoc._id)
        }
    }

    if (sizes)
        sizes = JSON.parse(sizes)
    if (colors)
        colors = JSON.parse(colors)

    for (let i = 0; i < imageIds.length; i++) {
        const imageId = imageIds[i]
        let public_id = await imageModel.findOneAndDelete({ _id: imageId }).public_id
        await deleteFromCloudinary(public_id)
    }

    // TODO: adding related products to the product
    // if (relatedProducts.length){

    // }

    // TODO: removing the deleted image references from the document
    // for (const imageId of imageIds) {
    //     const id = mongoose.Types.ObjectId.createFromHexString(imageId)

    // }

    const newProduct = {
        product_name,
        price,
        discount,
        description,
        category,
        colors,
        sizes,
        details,
        keyHighlights,
    }

    if (thumbnail)
        updatedProduct.thumbnail = thumbnail
    if (newImages.length)
        updatedProduct.images = newImages

    const updatedProduct = await productModel.findByIdAndUpdate(productId, newProduct, { new: true })

    res.status(200).json({
        success: true,
        message: 'product updated successfully',
        product: updatedProduct
    })
}
)

const deleteProduct = catchAsyncError(async (req, res, next) => {

    let productId = req.params.id

    if (!productId)
        throw new ApiError(400, "provide an id to delete")

    let product = await productModel.findById(productId)

    let thumbnail = product.thumbnail

    // // fetch and delete all images associated with the product
    // let imageDocs = await imageModel.find({ productId })

    // if (!imageDocs.length)
    //     throw new ApiError(400, "provide a valid product id")

    // for (const imageDoc of imageDocs) {
    //     await deleteFromCloudinary(imageDoc.public_id)
    //     await imageModel.findByIdAndDelete(imageDoc._id)
    // }

    // // finally deleting the product
    // await productModel.findByIdAndDelete(productId)

    res.status(200).json({
        success: true,
        message: 'product deleted successfully'
    })
}
)

export {
    addNewProduct,
    fetchProducts,
    editProduct,
    deleteProduct,
    fetchProductDetails
}