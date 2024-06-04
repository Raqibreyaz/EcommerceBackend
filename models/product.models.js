import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const sizeSchema = new mongoose.Schema({
    size: {
        type: String,
        default: "free size"
    },
    colors: [
        {
            color: {
                type: String,
                required: true
            },
            stocks: {
                type: Number,
                required: true
            }
        }
    ]

})

const productSchema = new mongoose.Schema({
    product_name: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    price: {
        type: Number,
        required: true,
        index: true
    },
    discount: {
        type: Number,
        default: 0,
        index: true
    },
    description: {
        type: String,
        required: true,
        minLength: [10, "description must be at least of 10 characters"]
    },
    category: {
        type: String,
        required: true,
        index: true
    },
    keyHighlights: {
        type: String,
        required: true,
        minLength: [10, "keyHighlights must be at least of 10 characters"]
    },
    thumbnail: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'image',
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        index: true
    },
    colors: {
        type: [String],
        required: true,
    },
    images: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'image',
        }
    ],
    sizes: [sizeSchema],
    rating: {
        type: Number,
        default: 4,
        index: true
    },
    details: {
        type: String,
        required: true,
        minLength: [10, "details must be at least of 10 characters"]
    },
    reviews: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'review'
    },
    related_products: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product'
        }
    ],
}, { timestamps: true })

productSchema.plugin(mongoosePaginate)

export default mongoose.model('product', productSchema)