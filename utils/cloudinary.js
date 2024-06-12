import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'


export const uploadOnCloudinary = async (filepath) => {
    try {
        let uploadResponse = await cloudinary.uploader.upload(filepath)
        fs.unlink(filepath, (err) => {
            if (err) {
                console.error(`Error deleting the local file: ${filepath}`, err);
            }
        });
        return uploadResponse
    } catch (error) {
        fs.unlink(filepath, (err) => {
            if (err) {
                console.error(`Error deleting the local file: ${filepath}`, err);
            }
        });
        error.message = `cloudinary upload error, ${error.message}`
        throw error
    }
}

export const deleteFromCloudinary = async (publicId) => {
    try {
        let deleteResponse = await cloudinary.uploader.destroy(publicId)
        return deleteResponse
    } catch (error) {
        throw error
    }
}

