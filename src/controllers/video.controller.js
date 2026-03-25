import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";


const getAllVideos = asyncHandler(async(req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    

    const pipeline = []
    // search using pipeline
    if(query) {
        pipeline.push({
            $match: {
                $or: [
                    {title: { $regex: query, $options: "i"}},
                    {description: { $regex: query, $options: "i"}}
                ]
            }
        })
    }


    // filter by user
    if(userId) {
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId) 
            }
        });
    }

    // sorting
    const sortOptions = {};

    if(sortBy){
        sortOptions[sortBy] = sortType?.toLowerCase() === "asc"? 1 : -1
    } else {
        sortOptions.createdAt = -1
    }

    pipeline.push({ $sort: sortOptions });

    // populate owner
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                        {
                        $project: {
                                username: 1,
                                fullName: 1,
                                avatar: 1
                            }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        }
    );

    const aggregate = await Video.aggregate(pipeline);

    const options = {
        page: Number(page),
        limit: Number(limit)
    };

    const videos = await Video.aggregatePaginate(aggregate, options);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "Videos fetched Successfully"
        )
    )

})

const publishAVideo = asyncHandler(async(req, res) => {
    const {title, description} = req.body;
    const videoFileLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path
    
    if(!title?.trim()) {    
        throw new ApiError(400, "title is required");
    }
    if(!description?.trim()) {
        throw new ApiError(400, "Description is required");
    }
    if(!videoFileLocalPath) {
        throw new ApiError(400, "Video File is missing")
    } 
    if(!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail is missing")
    }

    const VideoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!VideoFile) {
        throw new ApiError(500, "something went wrong while uploading the Video file")
    } 
    if(!thumbnail) {
        throw new ApiError(500, "something went wrong while uploading the thumbnail file")
    }

    const video = await Video.create({
        videoFile : VideoFile?.url,
        thumbnail: thumbnail?.url,
        title: title?.trim(),
        description,
        duration: VideoFile?.duration,
        owner: req.user?._id
    })

    const videoUploaded = await Video.findById(video?._id);

    if(!videoUploaded) {
        throw new ApiError(500, "publishing failed")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videoUploaded,
            "Video published Successfully"
        )
    )
})

const getVideoById = asyncHandler(async(req, res) => {
    const {videoId} = req.params;

    if(!videoId) {
        throw new ApiError(400, "video id is required");
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "video id is invalid");
    }
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized");
    }

    const userId = new mongoose.Types.ObjectId(req.user?._id)


    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            // owner of the video or channel info.
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline:[{
                            $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }}
                ]
            }
        },
        {
            $unwind: "$owner"
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
                totalLikes: {
                    $size: "$likes"
                },
                isLiked: {
                    $in: [userId, "$likes.likedBy"]
                }
            }
        },
        {
            $project: {
                likes: 0
            }
        }
    ])

    if (!video.length) {
        throw new ApiError(404, "Video not found");
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: { views: 1 }
    })
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video[0],
            "video fetched successfully"
        )
    )
})

const deleteVideo = asyncHandler(async(req, res) => {
    const {videoId} = req.params;

    if(!videoId) {
        throw new ApiError(404, "page not found");
    }

    await Video.findOneAndDelete({
        _id : videoId,
        owner: req.user?._id
    })
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video Deleted Successfully"
        )
    )
});

const updateVideo = asyncHandler(async(req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    const thumbnailLocalPath = req.file?.path;

    if(!title?.trim()) {
        throw new ApiError(400, "title is required");
    }
    if(!description?.trim()) {
        throw new ApiError(400, "description is required");
    }
    
    const updateData = {
        title: title.trim(),
        description: description.trim()
    }
    console.log(updateData);

    if (thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

        if(!thumbnail?.url) {
        throw new ApiError(401, "updating thumbnail failed")
        }

        updateData.thumbnail = thumbnail.url;
    }
    
    console.log(updateData);

    const video = await Video.findOneAndUpdate({
        _id: videoId,
        owner: req.user?._id
    }, {
        $set: updateData
    }, {
        new: true
    });

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "video updated successfully"
        )
    )
})

const togglePublishedStatus = asyncHandler(async(req, res) => {
    const { videoId } = req.params;
    
    if(!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID") 
    }

    const video = await Video.findOne({
        _id: videoId,
        owner: req.user?._id
    });

    if(!video) {
        throw new ApiError(400, "Video not found or unauthorized")
    }

    video.isPublished= !video.isPublished;
    await video.save({
        validateBeforesave: false
    });

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            `video ${video.isPublished ? "published" : "unpublished"} successfully`
        )
    )
})



export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    deleteVideo,
    updateVideo,
    togglePublishedStatus
}