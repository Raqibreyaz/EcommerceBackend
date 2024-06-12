import mongoose from "mongoose";

const imageSchema = new mongoose.Schema({

    docId: {
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