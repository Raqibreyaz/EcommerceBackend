import express from 'express'
import cors from 'cors'
import { errorMiddleWare } from './utils/ApiError.js'
import cookieParser from 'cookie-parser';
import userRouter from './routes/user.routes.js';
import productRouter from './routes/product.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['PUT', 'POST', 'GET', 'PATCH', 'DELETE']
}))

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/v1/users', userRouter)
app.use('/api/v1/products', productRouter)
app.use('/api/v1/dashboard',dashboardRouter)

app.use(errorMiddleWare)
export default app;