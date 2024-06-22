import { catchAsyncError } from '../utils/catchAsyncError.js'
import productModel from '../models/product.models.js'
import { ApiError } from '../utils/ApiError.js'
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import categoryModel from '../models/category.models.js'
import reviewModel from '../models/review.models.js'
import mongoose from 'mongoose'

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

    let productCategory = await categoryModel.findOne({ name: category.toLowerCase() })
    if (!productCategory) {
        throw new ApiError(404, "category does not exist")
    }

    if (req.files.length === 0)
        throw new ApiError(400, "Images are Required")

    colors = JSON.parse(colors)

    let colorsImages = {}
    let thumbnailPath = ''

    req.files.forEach(({ fieldname, path }) => {

        const regex = /\[(\d+)\]/;

        // extract the index from the fieldname
        const match = fieldname.match(regex)
        let index = ''
        console.log(match);
        if (match) {
            index = match[1]
            console.log(index);

            (colorsImages[index] ??= []).push({
                path,
                is_main: fieldname.includes('.mainImage')
            })
        }
        else
            thumbnailPath = path
    });

    console.log('thumbnail-path', thumbnailPath);

    console.log('given image files ', colorsImages);

    // upload the thumbnail
    let thumbnailResponse = await uploadOnCloudinary(thumbnailPath)

    // {url,public_id}
    let thumbnail = {
        url: thumbnailResponse.url,
        public_id: thumbnailResponse.public_id
    }

    let newColorsImages = {}

    // will populate the newColorsImages object
    for (const index in colorsImages) {
        if (Object.hasOwnProperty.call(colorsImages, index)) {
            const ithColorImages = colorsImages[index];

            let temp = []

            // will give an array of images corresponding to that indexThColor
            // {image:{url,public_id},is_main}
            for (const image of ithColorImages) {
                let cloudinaryResponse = await uploadOnCloudinary(image.path)
                temp.push({
                    image: {
                        url: cloudinaryResponse.url,
                        public_id: cloudinaryResponse.public_id
                    },
                    is_main: image.is_main
                })
            }

            console.log(temp);

            newColorsImages[index] = temp
        }
    }
    // {0:[{image:{},is_main}],1:[]}

    colors = colors.map((color, index) => (
        {
            color,
            images: newColorsImages[index]
        }
    ))

    // [{color,images}]

    keyHighlights = JSON.parse(keyHighlights)
    sizes = JSON.parse(sizes)
    stocks = JSON.parse(stocks)
    isReturnable = Boolean(isReturnable)

    let owner = req.user.id

    console.log(owner);
    console.log(sizes);
    console.log(stocks);
    console.log(keyHighlights);

    const product = await productModel.create({
        product_name,
        price,
        isReturnable, //can be a string
        returnPolicy,
        totalStocks,
        thumbnail,
        discount,
        description,
        category,
        keyHighlights,
        sizes,
        owner,
        details,
        stocks,
        colors
    })

    res.status(200).json({
        success: true,
        message: 'product created successfully',
        product
    })
}
)

// this function is responsible for pagination,sorting,filtering 
const fetchProducts = catchAsyncError(async (req, res, next) => {

    // const products = await productModel.find({}).limit(limit).skip((page - 1) * limit)

    const { page = 1, limit = 10, category, min_discount, owner, min_price, max_price, rating, sort } = req.query;

    console.log('query ', req.query);

    const pipeline = [];

    // Match stage to filter products based on provided criteria
    const matchStage = {};

    // if category is given for filtering then filter by category
    if (category) {
        // { category: 'sarees,kurti' }
        // $in will get an array containing string separated by ,
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

    const sortParams = {}
    if (sort) {
        for (const sortParam in sort) {
            if (Object.hasOwnProperty.call(sort, sortParam)) {
                const order = parseInt(sort[sortParam]);
                sortParams[sortParam] = order
            }
        }
        console.log(sortParams);
        // pipeline.push({ $sort: sortParams });
    }

    pipeline.push({
        // facet runs the two pipelines parellely data and filteredTotal
        $facet: {
            data: [
                // takes the documents who match this criteria
                { $match: matchStage },
                { $sort: sortParams },
                // will skip previous products --> for 11 to 20 , skip 1 to 10
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
                // only take 10 products
                { $limit: parseInt(limit) },
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
            metadata: [
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

    // get all the products
    const products = result[0].data;
    const filteredTotal = result[0].metadata.length ? result[0].metadata[0].totalItems : 0;
    const overallTotal = result[0].overallTotal.length ? result[0].overallTotal[0].count : 0;

    // Get approximate total count using $collStats
    // const overallTotal = await productModel.countDocuments()

    console.log(result);

    res.json({
        products,
        filteredTotal,
        overallTotal,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredTotal / limit),
        metaData: result[0].metadata
    });
})

const fetchProductDetails = catchAsyncError(async (req, res, next) => {

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
                $addFields: {
                    // colors: {
                    //     $map: {
                    //         input: "$colors",
                    //         as: "color",
                    //         in: {
                    //             color: "$$color.color",
                    //             images: {
                    //                 $map: {
                    //                     input: "$$color.images",
                    //                     as: "imageObj",
                    //                     in: {
                    //                         image: {
                    //                             // taking 0th element from the returned array
                    //                             $arrayElemAt: [
                    //                                 {
                    //                                     // finding the populated image which have the given id
                    //                                     $map: {
                    //                                         input: "$imageDetails",
                    //                                         as: "imageDetail",
                    //                                         in: {
                    //                                             $cond: {
                    //                                                 if: { eq: ["$$imageDetail._id", "$$imageObj.image"] },
                    //                                                 then: {
                    //                                                     _id: "$$imageDetail._id",
                    //                                                     url: "$$imageDetail.url"
                    //                                                 },
                    //                                                 else: null
                    //                                             }
                    //                                         },
                    //                                     }
                    //                                 }, {
                    //                                     $indexOfArray: ["$imageDetails._id", "$$imageObj.image"]
                    //                                 }
                    //                             ]
                    //                         },
                    //                         is_main: "$$imageObj.is_main"
                    //                     }
                    //                 }
                    //             }
                    //         }
                    //     }
                    // },
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
                                                            avatar: "$$reviewer.avatar.url"
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


// delete all reviews 
// delete all images including thumbnail and of colors
const deleteProduct = catchAsyncError(async (req, res, next) => {

    let productId = req.params.id

    if (!productId)
        throw new ApiError(400, "provide an id to delete")

    let product = await productModel.findById(productId)

    // product.reviews [] of object ids

    let result = await reviewModel.deleteMany({
        // $in takes the fields id and checks if it id present in the given array then delete
        _id: { $in: product.reviews }
    })

    console.log('Deletion done for reviews ', result);

    let deleteResponse = await deleteFromCloudinary(product.thumbnail.public_id)

    console.log('thumbnail delete response ', deleteResponse);

    for (const { images } of product.colors) {
        for (const { image } of images) {
            let deleteResponse = await deleteFromCloudinary(image.public_id)
            console.log('delete response ', deleteResponse);
        }
    }

    let deletedProduct = await findOneAndDelete({ _id: productId })

    console.log('finally product deleted');

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