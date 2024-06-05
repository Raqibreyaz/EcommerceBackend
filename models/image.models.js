import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({

// TODO: image will be binded with a color

    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        index: true
    },
    url: {
        type: String,
    },
    public_id: {
        type: String,
    }
});

export default mongoose.model('image', imageSchema);