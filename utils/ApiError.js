import { deleteProvidedImages } from './deleteProvidedImages.js'

class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.message = message;
        this.statusCode = statusCode
    }
}

const errorMiddleWare = (error, req, res, next) => {

    error.statusCode = error.statusCode || 500
    error.message = error.message || "internal server error"
    console.log(error);

    // when images were provided then delete them as they are waste now
    deleteProvidedImages(req)

    if (error.code === '11000') {
        error.message = `Duplicate Key Found ${Object.keys(error.keyValue)[0]}`
    }
    res.status(error.statusCode).json({
        success: false,
        message: error.message
    })
}

export { ApiError, errorMiddleWare }
