import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { Comment } from "../models/comment.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const addComment = asyncHandler(async(req, res) => {
    const { videoId } = req.params
    const { content } = req.body
    
    if(!videoId){
        throw new ApiError(400, "video id is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "video id is invalid")
    }
    if(!content || !content.trim()){
        throw new ApiError(400, "content is required")
    }

    
    const createdComment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user?._id
    })

    if(!createdComment) {
        throw new ApiError(400, "somthing went wrong while creating the content")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                commentId : createdComment._id,
                content: createdComment.content,
                avatar: req.user?.avatar,
                username: req.user?.username 
            },
            "comment created successfully"
        )
    )
})

const deleteComment = asyncHandler(async(req, res) => {
    const { commentId } = req.params
    
    if(!commentId) {
        throw new ApiError(400, "comment id is required")
    }
    if(!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "comment id is invalid")
    }
    if(!req.user?._id) {
        throw new ApiError(401, "unauthorized")
    }

    const deletedComment = await Comment.findOneAndDelete({
        _id: commentId,
        owner: req.user?._id
    })
    
    if(!deletedComment) {
        throw new ApiError(404, "comment not found or you are not authorized to delete it")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Comment deleted successfully"
        )
    )
})

const updateComment = asyncHandler(async(req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if(!commentId) {
        throw new ApiError(400, "comment id is required")
    }
    if(!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "comment id is invalid")
    }
    if(!content || !content.trim()) {
        throw new ApiError(400, "content is required")
    }
    if(!req.user?._id) {
        throw new ApiError(401, "unauthorized")
    }
    
    const updatedComment = await Comment.findOneAndUpdate({
        _id: commentId,
        owner: req.user._id
    }, {
        content: content.trim()
    },
    {
        new: true,
        runValidators: true
    })

    if(!updatedComment) {
        throw new ApiError(404, "comment not found or you are not authorized to update it")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedComment,
            "comment updated successfully"
        )
    )
})

const getVideoComments = asyncHandler(async(req, res) => {
    const { videoId } = req.params
    const { page = 1 } = req.query

    if(!videoId) {
        throw new ApiError(400, "video id is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "video id is invalid")
    }
    if(!req.user?._id) {
        throw new ApiError(401, "unauthorized")
    }

    const aggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails"
            }
        },
        {
            $unwind: "$userDetails"
        },
        {
            $addFields: {
                userComments: {
                    $eq: ["$owner", new mongoose.Types.ObjectId(req.user?._id)]
                }
            }
        },
        {
            $project: {
                content: 1,
                owner: 1,
                username: "$userDetails.username",
                avatar: "$userDetails.avatar",
                userComments: 1
            }
        }
    ])

    const Options = {
        page: Number(page),
        limit: 10
    }

    const aggregatedComments = await Comment.aggregatePaginate(aggregate, Options)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            aggregatedComments,
            "comments fetched successfully"
        )
    )
})




export {
    addComment,
    deleteComment,
    updateComment,
    getVideoComments
}