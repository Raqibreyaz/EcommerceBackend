import express from 'express'
import { connectToDatabase } from './db/db-connection.js'
import { config } from "dotenv";
import { errorMiddleWare } from './utils/ApiError.js'
import cookieParser from 'cookie-parser';
import userRouter from './routes/user.routes.js'; 
import productRouter from './routes/product.routes.js';

config({ path: "./.env" })

const app = express()
connectToDatabase()

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use('/api/v1/users',userRouter)
app.use('/api/v1/products',productRouter)

app.use(errorMiddleWare)
export default app;