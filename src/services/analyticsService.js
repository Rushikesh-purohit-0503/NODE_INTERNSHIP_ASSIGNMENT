const Booking = require('../models/bookingModel')
const Slot = require('../models/expertSlotModel')

// const getTotalBookingsPerExpert = async () => {
//     try {
//         const allBookings = await Booking.aggregate([
//             {
//                 $group: {
//                     _id: '$expertId',
//                     totalBookings: { $sum: 1 },
//                 },

//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "_id",
//                     foreignField: "_id",
//                     as: "expertDetails"
//                 }
//             },
//             {
//                 $unwind: "$expertDetails"
//             },
//             {
//                 $project: {
//                     expertId: "$_id",
//                     _id: 0,
//                     totalBookings: 1,
//                     expertName: "$expertDetails.name",
//                     expertEmail: "$expertDetails.email"
//                 }
//             }

//         ])


//         if (allBookings) {
//             return {
//                 status: true,
//                 message: "Total bookings retrieved successfully",
//                 data: { allBookings }
//             };
//         } else {
//             return {
//                 status: false,
//                 message: "There are no Bookings",
//                 data: {}
//             }
//         }
//     } catch (error) {
//         console.error("Error while calculating total bookings:", error);
//         throw new Error(error)
//         // return {
//         //     status: false,
//         //     message: "Error occurred while retrieving total bookings",
//         //     error: error.message
//         // };
//     }
// }

// const getUtilizationRate = async () => {
//     try {

//         const totalSlots = await Slot.countDocuments({});


//         const bookedSlots = await Slot.aggregate([
//             {
//                 $match: {
//                     bookedCount: { $gte: 1 },
//                     isBlocked: false
//                 }
//             },
//             {
//                 $project: {
//                     bookedCount: { $size: "$bookings" }
//                 }
//             },
//             {
//                 $group: {
//                     _id: null,
//                     totalBookedSlots: { $sum: 1 }
//                 }
//             }
//         ]);

//         const totalBookedSlots = bookedSlots[0]?.totalBookedSlots || 0;
//         const utilizationRate = totalSlots
//             ? ((totalBookedSlots / totalSlots) * 100).toFixed(2)
//             : 0;

//         return {
//             status: true,
//             message: "Utilization rate calculated successfully",
//             data: {
//                 totalSlots,
//                 totalBookedSlots,
//                 utilizationRate: `${utilizationRate}%`
//             }
//         };
//     } catch (error) {
//         console.error("Error while calculating utilization rate:", error);
//         return {
//             status: false,
//             message: "Error occurred while calculating utilization rate",
//             error: error.message
//         };
//     }
// };

// const getNoShowStatistics = async ({ startDate, endDate }) => {
//     try {
//         const noShowStats = await Booking.aggregate([
//             {
//                 $match: {
//                     date: { $gte: new Date(startDate), $lte: new Date(endDate) },
//                     status: "no-show"
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$clientId", 
//                     noShowCount: { $sum: 1 } 
//                 }
//             }
//         ]);

//         return {
//             status: true,
//             message: "No-show statistics retrieved successfully",
//             data: noShowStats
//         };
//     } catch (error) {
//         console.error("Error while calculating no-show statistics:", error);
//         return {
//             status: false,
//             message: "Error occurred while retrieving no-show statistics",
//             error: error.message
//         };
//     }
// };

const getAnalytics = async () => {
    try {
        // Get total bookings per expert
        const allBookings = await Booking.aggregate([
            {
                $group: {
                    _id: '$expertId',
                    totalBookings: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "expertDetails"
                }
            },
            {
                $unwind: "$expertDetails"
            },
            {
                $project: {
                    expertId: "$_id",
                    _id: 0,
                    totalBookings: 1,
                    expertName: "$expertDetails.name",
                    expertEmail: "$expertDetails.email"
                }
            }
        ]);

        // Get utilization rate
        const totalSlots = await Slot.countDocuments({});
        const bookedSlots = await Slot.aggregate([
            {
                $match: {
                    bookedCount: { $gte: 1 },
                    isBlocked: false
                }
            },
            {
                $project: {
                    bookedCount: { $size: "$bookings" }
                }
            },
            {
                $group: {
                    _id: null,
                    totalBookedSlots: { $sum: 1 }
                }
            }
        ]);
        const totalBookedSlots = bookedSlots[0]?.totalBookedSlots || 0;
        const utilizationRate = totalSlots
            ? ((totalBookedSlots / totalSlots) * 100).toFixed(2)
            : 0;

        // Get no-show statistics
        const noShowStats = await Booking.aggregate([
            {
                $match: {
                    status: "no-show"
                }
            },
            {
                $group: {
                    _id: "$clientId",
                    noShowCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "clientDetails"
                }
            },
            {
                $unwind: "$clientDetails"
            },
            {

                $project: {
                    expertId: "$_id",
                    clientId: 1,
                    _id: 0,
                    totalBookings: 1,
                    clientName: "$clientDetails.name",
                    clientEmail: "$clientDetails.email",
                    noShowCount: 1
                }

            }
        ]);

        return {
            status: true,
            message: "Analytics retrieved successfully",
            data: {
                totalBookingsPerExpert: allBookings,
                totalSlots,
                totalBookedSlots,
                utilizationRate: `${utilizationRate}%`,
                noShowStats
            }
        };
    } catch (error) {
        console.error("Error while retrieving analytics:", error);
        return {
            status: false,
            message: "Error occurred while retrieving analytics",
            error: error.message
        };
    }
};

module.exports = {
    // getNoShowStatistics,
    // getUtilizationRate,
    // getTotalBookingsPerExpert
    getAnalytics
}