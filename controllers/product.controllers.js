import { catchAsyncError } from '../utils/catchAsyncError.js'
import productModel from '../models/product.models.js'
import { ApiError } from '../utils/ApiError.js'
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import categoryModel from '../models/category.models.js'
import reviewModel from '../models/review.models.js'
import { checkArrays, checker } from '../utils/objectAndArrayChecker.js'
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

    if (checker(req.body, { isReturnable, discount }, 11))
        throw new ApiError(400, "provide full info of the product")

    let productCategory = await categoryModel.findOne({ name: category.toLowerCase() })
    if (!productCategory) {
        throw new ApiError(404, "category does not exist")
    }

    colors = JSON.parse(colors)
    keyHighlights = JSON.parse(keyHighlights)
    sizes = JSON.parse(sizes)
    stocks = JSON.parse(stocks)

    let arrayCheck = checkArrays({ colors, keyHighlights, sizes, stocks, images: req.files })
    if (arrayCheck)
        throw new ApiError(400, `${arrayCheck} are required!!`)

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

                let imageObj = {
                    image: {
                        url: cloudinaryResponse.url,
                        public_id: cloudinaryResponse.public_id
                    },
                    is_main: image.is_main
                };

                // inserting main image at the 0th index to get it at O(1)
                if (image.is_main) {
                    temp.unshift(imageObj)
                }
                else {
                    temp.push(imageObj)
                }
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
    })
}
)

// this function is responsible for pagination,sorting,filtering 
const fetchProducts = catchAsyncError(async (req, res, next) => {

    // const products = await productModel.find({}).limit(limit).skip((page - 1) * limit)

    const { page = 1, limit = 10, category, min_discount, product_owners, min_price, max_price, rating, sort } = req.query;

    const pipeline = [];

    // Match stage to filter products based on provided criteria
    const matchStage = {};

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
        const obj = {
            $gte: parseInt(min_price)
        }
        if (max_price) {
            obj.$lte = parseInt(max_price)
        }
        matchStage.price = obj;
    }

    if (min_discount) {
        matchStage.discount = { $gte: parseInt(min_discount) }
    }

    // owner must be the id
    // if (product_owners) {
    //     matchStage.owner = mongoose.Types.ObjectId.createFromHexString(owner)
    // }

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

    pipeline.push({ $match: matchStage })

    if (sort) {
        const sortParams = {}
        for (const sortParam in sort) {
            if (Object.hasOwnProperty.call(sort, sortParam)) {
                const order = parseInt(sort[sortParam]);
                sortParams[sortParam] = order
            }
        }
        console.log(sortParams); //{rating:-1,price:1}
        pipeline.push({ $sort: sortParams });
    }

    pipeline.push({
        // facet runs the two pipelines parellely data and filteredTotal
        $facet: {
            data: [
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

    res.status(200).json({
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
                reviews: {
                    $map: {
                        input: "$productReviews",
                        as: "review",
                        in: {
                            user: {
                                $arrayElemAt: [
                                    {
                                        $filter: {
                                            input: "$reviewers",
                                            as: "reviewer",
                                            cond: {
                                                $eq: ["$$reviewer._id", "$$review.userId"]
                                            }
                                        }
                                    },
                                    0
                                ]
                            },
                            oneWord: "$$review.oneWord",
                            review: "$$review.review",
                            rating: "$$review.rating"
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
                "reviews.oneWord": 1,
                "reviews.rating": 1,
                "reviews.review": 1,
                "reviews.user.fullname": 1,
                "reviews.user.avatar": 1,
                "reviews.user._id": 1,
                "reviews.user.address": {
                    $arrayElemAt: ["$reviews.user.addresses", 0]
                }
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

    if (!checker({ ...req.body, ...req.params }, { isReturnable, discount }, 13))
        throw new ApiError(400, "provide necessary details to update product")

    let {
        product_name,
        price,
        discount,
        description,
        category,
        sizes,
        details,
        keyHighlights,
        stocks,
        oldColors,
        newColors,
        isReturnable,
        returnPolicy,
        totalStocks,
    } = req.body

    const productId = req.params.id

    sizes = JSON.parse(sizes)
    keyHighlights = JSON.parse(keyHighlights)
    oldColors = JSON.parse(oldColors)
    newColors = JSON.parse(newColors)
    stocks = JSON.parse(stocks)

    // take all the files of new colors
    // take all the files which are to be inserted
    // completely remove all images of a color if it is deleted
    // when new thumbnail is provided then delete old thumbnail
    // newMainImage[] , toBeInserted[],newThumbnail , newColors[] ,newColor[].mainImage

    let toBeDeleted = []
    let newThumbnail = ''
    const oldProduct = await productModel.findById(productId)

    // when new files are provided then upload on cloud and store 
    for (let i = 0; i < req.files.length; i++) {

        const { fieldname, path } = req.files[i];

        const cloudinaryResponse = await uploadOnCloudinary(path)

        const regex = /\[(\d+)\]/;

        const match = fieldname.match(regex)

        let index = ''

        console.log(match);

        if (match)
            index = parseInt(match[1])

        // when index not found new thumbnail is provided
        if (!index && fieldname.includes('newThumbnail')) {
            newThumbnail = {
                url: cloudinaryResponse.url,
                public_id: cloudinaryResponse.public_id
            }
            toBeDeleted.push(oldProduct.thumbnail.public_id)
        }
        // when new colors are available
        else if (fieldname.includes('newColors')) {
            // newColors[idnex]='red' --> {color:'red',images:[{image:{},is_main}]}
            const imageObj = {
                image: {
                    url: cloudinaryResponse.url,
                    public_id: cloudinaryResponse.public_id
                },
                is_main: fieldname.includes('.mainImage')
            }

            if (typeof newColors[index] === 'object') {

                // insert main image at the 0th index for T.C. O(1)
                if (imageObj.is_main) {
                    newColors[index].images.unshift(imageObj)
                }
                else
                    newColors[index].images.push(imageObj)
            }
            else {
                const tempObj = {
                    color: newColors[index],
                    images: [imageObj],
                }

                newColors[index] = tempObj
            }
        }
        // when old colors have changes
        else {
            // toBeInserted[] , newMainImage[]
            // oldColors[{color,images,mainImage,toBeDeleted,colorId}]

            let isMain = false

            // when there is a new mainImage then remove old mainImage
            if (fieldname.includes('newMainImage')) {
                isMain = true,
                    toBeDeleted.push(oldColors[index].mainImage.image.public_id)

                // by doing this we ensure that when a oldMainImage exist then it means the color hasnt any main image
                oldColors[index].mainImage = null
            }

            let imageObj = {
                image: {
                    url: cloudinaryResponse.url,
                    public_id: cloudinaryResponse.public_id
                },
                is_main: isMain
            }

            // insert main image at the 0th index for T.C. O(1)
            if (isMain) {
                oldColors[index].images.unshift(imageObj)
            }
            else {
                oldColors[index].images.push(imageObj)
            }

        }
    }

    // deleting images of removed colors
    for (const { _id, images } of oldProduct.colors) {

        let oldColorId = _id.toString()
        let check = false

        // checking if the oldColorId matches with updated colors id
        for (let { colorId } of oldColors) {
            if (colorId === oldColorId) {
                check = true
                break
            }
        }

        // when the color is deleted then pick its images for deletion
        if (!check) {
            let publicIds = images.map(({ image }) => image.public_id)
            toBeDeleted = [...toBeDeleted, ...publicIds]
        }
    }

    // add mainImages to their respective colors
    oldColors = oldColors.map(({ color, images, mainImage, toBeDeleted: removedImages }) => {

        // take images which have to be deleted from that color
        toBeDeleted = [...toBeDeleted, ...removedImages]

        // when mainImage exists it means we have to include it in images at 0 index 
        // when no mainImage exist then it is already set , just return
        return mainImage ? { color, images: [mainImage, ...images] } : { color, images }
    })

    // handled oldColors
    // handled newColors
    // handles mainImages
    // handled removed colors
    // handled newThumbnail

    console.log('old colors ', oldColors);
    console.log('new colors ', newColors);

    const newUpdatedColors = [...oldColors, ...newColors]

    console.log('new updated colors ', newUpdatedColors);

    let newProduct = {
        product_name,
        price,
        discount,
        description,
        category,
        sizes,
        details,
        keyHighlights,
        stocks,
        isReturnable,
        returnPolicy,
        totalStocks,
        colors: newUpdatedColors
    }

    console.log('new product ', newProduct);

    // when theres a new thumbnail then take it
    if (newThumbnail)
        newProduct.thumbnail = newThumbnail

    let updatedProduct = await productModel.findByIdAndUpdate(
        productId,
        // only change the given fields
        { $set: newProduct },
        { new: true }
    )

    // finally deleting the given images
    for (const public_id of toBeDeleted) {
        let deleteResponse = await deleteFromCloudinary(public_id)
        console.log('delete response ', deleteResponse);
    }

    res.status(200).json({
        success: true,
        message: "product updated successfully"
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