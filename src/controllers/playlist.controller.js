import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async(req, res) => {
    const { name, description } = req.body;


    if(!name?.trim()) {
        throw new ApiError(400, "name is required")
    }
    if(!description?.trim()) {
        throw new ApiError(400, "description is required")
    }

    const playlist = await Playlist.create({
        name : name.trim(),
        description : !description?.trim(),
        owner: req.user?._id
    })

    if(!playlist){
        throw new ApiError(500, "Something went wrong while creating the playlist")
    }
    return res
    .status(201)
    .json(
        new ApiResponse(
            201,
            playlist,
            "playlist created Successfully"
        )
    )

})

const deletePlaylist = asyncHandler(async(req, res) => {
    const {playlistId} = req.params
    
    if(!playlistId){
        throw new ApiError(400, "playlist id is required")
    }

    if(!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlistId")
    }

    const deleted = await Playlist.findOneAndDelete({
        _id: playlistId,
        owner: req.user?._id
    });

    if(!deleted) {
        throw new ApiError(404, "Playlist not found or unauthorized")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Playlist deleted successfully"
        )
    )
})

const updatePlaylist = asyncHandler(async(req, res) => {
    const { playlistId } = req.params
    const {name, description} = req.body
    
    if(!playlistId) {
        throw new ApiError(400, "playlistId is required")
    }
    if(!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid playlistId")
    }
    if(!name.trim()) {
        throw new ApiError(400, "name is required")
    }
    if(!description.trim()) {
        throw new ApiError(400, "description is required")
    }
    
    const playlist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user?._id
        },
        {
            name: name.trim(),
            description: description.trim()
        },
        {
            new: true
        }
    );
    
    if(!playlist) {
        throw new ApiError(404, "Playlist not found or unauthorized")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            "playlist Updated Successfully"
        )
    )
});

const addVideoToPlaylist = asyncHandler(async(req, res) => {
    const {playlistId, videoId} = req.params
    
    if(!playlistId) {
        throw new ApiError(400, "playlistId is required")
    }
    if(!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "playlistId is invalid")
    }
    if(!videoId) {
        throw new ApiError(400, "videoId is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "videoId is invalid")
    }


    const addedVideo = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user?._id
        },
        {
            $addToSet: { videos: videoId }
        },
        {
            new: true
        }
    )

    if(!addedVideo) {
        throw new ApiError(404, "Playlist not found or unauthorized")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            addedVideo,
            "Video added in playlist successfully"
        )
    )
})

const removeVideoFromPlaylist = asyncHandler(async(req, res) => {
    const {playlistId, videoId} = req.params

    if(!playlistId){
        throw new ApiError(400, "playlist id is required")
    }
    if(!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "playlist id is invalid")
    }
    if(!videoId){
        throw new ApiError(400, "video is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "video id is invalid")
    }
    
    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user?._id
        },
        {
            $pull: {
                videos : videoId
            }
        },
        {
            new: true
        }
    )

    if(!updatedPlaylist) {
        throw new ApiError(404, "Playlist not found or unauthorized")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "video deleted successfully"
        )
    )

})

const getUserPlaylists = asyncHandler(async(req, res) => {
    const { UserId } = req.params
    const { page = 1 } = req.query
    
    if(!UserId) {
        throw new ApiError(400, "UserId is Required")
    }
    if(!mongoose.Types.ObjectId.isValid(UserId)) {
        throw new ApiError(404, "UserId is invalid")
    }


    const Playlists = Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(UserId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "userDetails"
            }
        },
        {
            $lookup: {
                from: "videos",
                let: { videoIds: "$videos" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: [ "$_id", "$$videoIds"] }
                        }
                    },
                    {
                        $project: {
                            thumbnail: 1,
                            title: 1
                        }
                    },
                    {
                        $limit: 2
                    }
                ],
                as: "videoDetails"
            }
        },
        {
            $unwind: "$userDetails"
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                    ownerName: "$userDetails.fullName"
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                totalVideos: 1,
                userDetails: 1,
                ownerName: 1,
                videoDetails: 1
            }
        }
    ])

    if(!Playlists) {
        throw new ApiError(404, "something went wrong while fetching the playlists")
    }
    
    const Options = {
        page: Number(page),
        limit: 10
    }

    const systematicPlaylist = await Playlist.aggregatePaginate(Playlists, Options)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            systematicPlaylist,
            "fetched playlists successfully"
        )
    )
})

const getPlaylistById = asyncHandler(async(req, res) => {
    const { playlistId } = req.params
    const { page = 1 } = req.query

    if (!playlistId) {
        throw new ApiError(400, "Playlist ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    
    const videoIds = playlist.videos
    const videos = Video.aggregate([
        {
            $match: {
                _id: { $in: videoIds }
            }
        },
        {
            $addFields: {
                order: { $indexOfArray: [videoIds, "$_id"] }
            }
        },
        {
            $sort: {
                order: 1
            }
        }
    ]);

    const Options = {
        page: Number(page),
        limit: 10
    }
    
    const systematicVideos = await Video.aggregatePaginate(videos, Options);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                totalVideos: videoIds.length,
                playlist,
                systematicVideos
            },
            "playlist videos fetched successfully"
        )
    ) 
})


export {
    createPlaylist,
    deletePlaylist,
    updatePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getUserPlaylists,
    getPlaylistById
}