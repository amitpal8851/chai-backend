import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken, changeUserPassword, updateAccountDetails, getCurrentUser, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getUserWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post( loginUser )


// secured routes
router.route("/logout").post(verifyJWT, logoutUser )

// refresh token
router.route("/refresh-token").post(refreshAccessToken)

// changeUserPassword
router.route("/change-password").post(
    verifyJWT,
    changeUserPassword
)

router.route("/current-user").get(
    verifyJWT,
    getCurrentUser
)

// update details of user
router.route("/update-details").patch(
    verifyJWT,
    updateAccountDetails
)

// update avatar
router.route("/update-avatar").patch(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
)

// update coverImage
router.route("/update-coverImage").patch(
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
)

router.route("/c/:username").get(verifyJWT, getUserChannelProfile)


router.route("/watchHistory").get(verifyJWT, getUserWatchHistory)

export default router;