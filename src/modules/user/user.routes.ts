import {Router , Request , Response , NextFunction} from 'express'

const router = Router();

router.get("/", (req:Request, res:Response, next:NextFunction):any=>{
    return res.status(200).json({
        messgae:"hellow mr.Mohamed"
    })
})
export default router;