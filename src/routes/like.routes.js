import { Router } from "express"
import { toggleVideoLike, getLikedVideos } from "../controllers/like.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT);

router.route("/:videoId").post( toggleVideoLike )

router.route("/").get(getLikedVideos)

export default router