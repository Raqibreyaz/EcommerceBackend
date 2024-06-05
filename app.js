import express from 'express'
import { config } from "dotenv";
import cors from 'cors'
import { connectToDatabase } from './db/db-connection.js'
import { errorMiddleWare } from './utils/ApiError.js'
import cookieParser from 'cookie-parser';
import userRouter from './routes/user.routes.js'; 
import productRouter from './routes/product.routes.js';

config({ path: "./.env" })

const app = express()
connectToDatabase()

app.use(cors({
    origin:[process.env.FRONTEND_URL,process.env.DASHBOARD_URL],
}))

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use('/api/v1/users',userRouter)
app.use('/api/v1/products',productRouter)

app.use(errorMiddleWare)
export default app;