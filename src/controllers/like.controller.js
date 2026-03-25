import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const toggleVideoLike = asyncHandler(async(req, res) => {
    const { videoId } = req.params

    if(!videoId) {
        throw new ApiError(400, "Video Id is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Video Id is invalid")
    }
    if (!req.user?._id) {
        throw new ApiError(401, "unauthorized");
    }

    const isLiked = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    });

    if(!isLiked) {
        const liked = await Like.create({
            video: videoId,
            likedBy: req.user?._id
        })

        if(!liked) {
            throw new ApiError(400, "something went wrong while creating the like");
        }

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {liked: true},
                "video liked successfully"
            )
        )
    }
    const deleteLiked = await Like.deleteOne({
            video: videoId,
            likedBy: req.user?._id
        })

        if (deleteLiked.deletedCount === 0) {
            throw new ApiError(400, "Like not found");
        }

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {liked: false},
                "video unliked successfully"
            )
        )
});

const getLikedVideos = asyncHandler(async(req, res) => {
    const {page = 1} = req.query
    
    const aggregate = Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos"
            }
        },
        {
            $unwind: "$likedVideos"
        },
        {
            $replaceRoot: {
                newRoot: "$likedVideos"
            }
        }
    ])

    const Options = {
        page : Number(page),
        limit : 10
    }

    const likedSystematicVideos = await Like.aggregatePaginate(aggregate, Options)
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            likedSystematicVideos,
            "liked videos fetched successfully"
        )
    )
})

export {
    toggleVideoLike,
    getLikedVideos
}