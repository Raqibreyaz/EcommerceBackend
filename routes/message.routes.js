import express from "express"
import { createMessage, fetchMessages } from "../controllers/message.controllers.js";

const router = express.Router()

router.route('/create-message').post(createMessage)

router.route('/get-messages').get(fetchMessages)

export default router;