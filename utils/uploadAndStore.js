import { uploadOnCloudinary } from "./cloudinary.js"

export const uploadAndStore = async (files) => {

    // {0:[{image:{url,public_id},is_main:boolean}]
    let newImages = {}
    let thumbnail = null

    console.log('taking new images uploading to cloudinary');

    //O(n*4) as every color has 4 images
    for (const { fieldname, path } of files ? files : []) {

        const regex = /\[(\d+)\]/;

        const match = fieldname.match(regex)

        const cloudinaryResponse = await uploadOnCloudinary(path)

        const image = {
            url: cloudinaryResponse.url,
            public_id: cloudinaryResponse.public_id
        }

        // when match exists means it is a normal image
        if (match) {
            if (fieldname.includes('mainImage')) {
                (newImages[match[1]] ??= []).push({
                    image,
                    is_main: true
                })
            }
            else {
                (newImages[match[1]] ??= []).push({
                    image,
                    is_main: false
                })
            }
        }
        // when match not exists then it is a thumbnail
        else {
            thumbnail = image
        }
    }

    //newImages:{0:[{image:{url,public_id},is_main:boolean}]}
    // thumbnail:{url,public_id}

    return [newImages, thumbnail]
}
