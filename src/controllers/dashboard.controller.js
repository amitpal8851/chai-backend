import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subsciption.model.js"




const getChannelStats = asyncHandler(async(req, res) => {

    const userId = req.user._id;

    if(!userId) {
        throw new ApiError(400, "user id is required")
    }
    if(!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "unauthorized request")
    }

    const totalStats = await Video.aggregate([
        {
            $match: {owner: userId}
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                }
            }
        },
        {
            $group: {
                _id: null,
                totalViews: {$sum: "$views"},
                totalVideos: {$sum: 1},
                totalLikes: {$sum: "$likesCount" }
            }
        },
        {
            $project: {
                _id: 0,
                totalViews: 1,
                totalVideos: 1,
                totalLikes: 1
            }
        }
    ])

    const stats = totalStats[0] || { totalViews: 0, totalVideos: 0, totalLikes: 0 };

    const totalSubscribers = await Subscription.countDocuments({ channel: userId })
    

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                totalViews: stats.totalViews || 0,
                totalVideos: stats.totalVideos || 0,
                totalLikes: stats.totalLikes || 0,
                totalSubscribers
            },
            "data fetched successfully"
        )
    )

})

const getChannelVideos = asyncHandler(async(req,res) => {
    const userId = req.user._id;

    if(!userId) {
        throw new ApiError(400, "user id is required")
    }
    if(!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "unauthorized request")
    }

    const videos = await Video.find({owner: userId})

    if(!videos || videos.length === 0){
        throw new ApiError(404, "videos not found")
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "videos fetched successfully"
        )
    )
})


export {
    getChannelStats,
    getChannelVideos
}