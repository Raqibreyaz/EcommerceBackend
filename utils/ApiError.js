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

    if (error.code === '11000') {
        console.log(Object.keys(error.keyValue)[0]);
        error.message = `Duplicate Key Found ${Object.keys(error.keyValue)[0]}`
    }
console.log(error);
    res.status(error.statusCode).json({
        success: false,
        message: error.message
    })
}

export { ApiError, errorMiddleWare }
