import express from 'express'
import { unifiedLogin } from '../controllers/authController.js'

const authRouter = express.Router()

authRouter.post('/login', unifiedLogin)

export default authRouter