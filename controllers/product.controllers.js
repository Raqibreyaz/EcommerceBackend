import { catchAsyncError } from '../utils/catchAsyncError.js'
import productModel from '../models/product.models.js'
import imageModel from '../models/image.models.js'
import { ApiError } from '../utils/ApiError.js'
import { deleteFromCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import categoryModel from '../models/category.models.js'
import { cartModel } from '../models/CartAndOrder.models.js'
import mongoose from 'mongoose'

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

    // TODO: every image will have an associated color to bind with it

    // taking all the provided text data
    let {
        product_name,
        price,
        discount,
        description,
        category,
        keyHighlights,
        colors,
        sizes,
        details,
        stocks,
        related_products = []
    } = req.body;

    sizes = JSON.parse(sizes)
    colors = JSON.parse(colors)

    // take the given category first
    let productCategory = await categoryModel.findOne({ name: category.toLowerCase() })

    if (!productCategory) {
        throw new ApiError(404, "category does not exist")
    }

    // creating the product 
    const product = await productModel.create({
        product_name,
        price,
        discount,
        description,
        category: productCategory.name,
        keyHighlights,
        owner: req.user.id,
        colors,
        sizes,
        details,
        stocks,
        related_products
    })

    let thumbnail = ''
    let images = []

    if (!req.files || !req.files.thumbnail || !req.files.images)
        throw new ApiError(400, "thumbnail and images are required!!")

    // take the images paths
    thumbnail = req.files.thumbnail[0].path
    images = req.files.images.map(image => image.path)

    // upload thumbnail on cloudinary and create the image document
    thumbnail = await uploadOnCloudinary(thumbnail)
    thumbnail = await imageModel.create({ url: thumbnail.url, public_id: thumbnail.public_id, productId: product._id })

    // newImages-> {_id,url,productId,public_id}
    // upload images on cloudinary and create and push the image document into newImages
    const newImages = []
    for (let i = 0; i < images.length; i++) {
        let response = await uploadOnCloudinary(images[i])
        let imageDoc = await imageModel.create({
            url: response.url,
            public_id: response.public_id,
            productId: product._id
        })
        newImages.push(imageDoc)
    }

    // push the thumbnail and newImages into the product
    product.thumbnail = thumbnail._id
    newImages.forEach((image) => {
        product.images.push(image._id)
    });

    // finally save the product
    await product.save()

    res.status(200).json({
        success: true,
        message: 'product created successfully'
    })
}
)

// this function is responsible for pagination,sorting,filtering 
const fetchProducts = catchAsyncError(async (req, res, next) => {

    // { page: '1', limit: '10', category: 'price,rating' }

    // const products = await productModel.find({}).limit(limit).skip((page - 1) * limit)

    const { page = 1, limit = 10, category, min_discount, owner, min_price, max_price, rating, sort_by, order = 'asc' } = req.query;

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
        matchStage.owner = new mongoose.Types.ObjectId(owner)
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
                { $skip: (parseInt(page) - 1) * parseInt(limit) },
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
                        rating: 1,
                        stocks: 1,
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
    const result = await productModel.aggregate(pipeline).exec();

    console.log(result);

    // get all the products
    const products = result[0].data;
    const filteredTotal = result[0].filteredTotal.length ? result[0].filteredTotal[0].count : 0;
    const overallTotal = result[0].total.length ? result[0].total[0].count : 0;

    // Get approximate total count using $collStats
    // const overallTotal = await productModel.countDocuments()

    console.log('total products ', overallTotal);

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
    const { id } = req.params
    
}
)

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
        //imageIds of every image associated to the product to be deleted
        imageIds,
        // ids of products []
        relatedProducts
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

    sizes = JSON.parse(sizes)
    colors = JSON.parse(colors)

    for (const imageId of imageIds) {
        let public_id = await imageModel.findOneAndDelete({ _id: imageId }).public_id
        await deleteFromCloudinary(public_id)
    }

    const product = await productModel.findOneAndUpdate({
        product_name,
        price,
        discount,
        description,
        category,
        colors,
        sizes,
        details,
        keyHighlights,
        thumbnail,
        images: newImages
    })
}
)

const deleteProduct = catchAsyncError(async (req, res, next) => {

    let productId = req.params.id

    // fetch and delete all images associated with the product
    let imageDocs = await imageModel.find({ productId })
    console.log(imageDocs);
    for (const imageDoc of imageDocs) {
        await deleteFromCloudinary(imageDoc.public_id)
        await imageModel.findByIdAndDelete(imageDoc._id)
    }

    // finally deleting the product
    await productModel.findByIdAndDelete(productId)

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