import mongoose from "mongoose";

const imageSchema = new mongoose.Schema();

export default mongoose.model('image', imageSchema);