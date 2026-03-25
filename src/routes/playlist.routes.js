import { Router } from "express";
import {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist,

} from "../controllers/playlist.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();
router.use(verifyJWT)

router.route("/")
    .post(createPlaylist)

    
router.route("/users/:userId")
    .get(getUserPlaylists)

router.route("/:playlistId")
    .get(getPlaylistById)
    .delete(deletePlaylist)
    .patch(updatePlaylist)


router.route("/:playlistId/videos/:videoId")
    .post(addVideoToPlaylist)
    .delete(removeVideoFromPlaylist)

export default router;