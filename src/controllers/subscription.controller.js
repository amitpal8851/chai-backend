import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subsciption.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const toggleSubscription = asyncHandler(async(req, res) => {
    const {channelId} = req.params

    if(!channelId) {
        throw new ApiError(400, "Channel ID is required")
    }
    // Prevent self-subscription
    if (channelId === req.user?._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    const subscriptionStatus = await Subscription.findOne(
        {
            subscriber: req.user?._id,
            channel: channelId
        }
    );

     if(subscriptionStatus){
        // unSubscribe
        await Subscription.findByIdAndDelete(subscriptionStatus._id);

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "channel unsubscribed successfully"
            )
        )
    } else {
        const subscribe = await Subscription.create({
            channel: channelId,
            subscriber: req.user?._id
        });

        return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                subscribe,
                "channel subscribed successfully"
            )
        )
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const {page = 1} = req.query 
    
    if(!channelId) {
        throw new ApiError(400, "channelId is required")
    }
    
    const aggregate = Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $project: {
                fullName: "$user.fullName",
                avatar: "$user.avatar"
            }
        }
    ]);

    const options = {
        page: Number(page),
        limit: Number(10)
    };

    const subscribers = await Subscription.aggregatePaginate(aggregate, options)

    return res
    .status(201)
    .json(
        new ApiResponse(
            200,
            subscribers,
            "subscribers fetched successfully"
        )
    )

});

//  controller to return channels user is subscribed to 
const getSubscribedChannel = asyncHandler(async(req, res) => {
    const { subscriberId } = req.params;
    const { page = 1 } = req.query;

    if(!subscriberId) {
        throw new ApiError(400, "subscriberId is required")
    }

    const aggregate = Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $unwind: "$user"
        },
        {
            $project: {
                fullName: "$user.fullName",
                avatar: "$user.avatar"
            }
        }
    ]);

    const options = {
        page: Number(page),
        limit: Number(10)
    } 

    const subscribers = await Subscription.aggregatePaginate(aggregate, options);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscribers,
            "channels fetched successfully"
        )
    )
})


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannel
}