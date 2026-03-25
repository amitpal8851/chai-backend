import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/video/:videoId")
        .post(addComment)
        .get(getVideoComments)

router.route("/:commentId")
        .delete(deleteComment)
        .patch(updateComment)


export default router;