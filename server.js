import app from "./app.js";
import {v2 as cloudinary} from 'cloudinary'

const port = process.env.PORT;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.listen(port, () => {
    console.log(`server is running on port ${port}`);
}
)