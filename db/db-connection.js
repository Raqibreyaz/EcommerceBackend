import mongoose from 'mongoose'

export const connectToDatabase = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)

        console.log(`mongodb connection successfull`);
    } catch (error) {
        console.log(`error while connecting to database ${error}`);
    }
}

