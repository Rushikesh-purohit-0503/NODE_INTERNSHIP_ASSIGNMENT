const Slot = require('../models/expertSlotModel')
const Booking = require('../models/bookingModel')
const { default: mongoose } = require('mongoose')
const { redis, bookingQueue } = require('../utils/Redis')
const cron = require('node-cron')
const checkWeeklyLimit = async (clientId, expertId) => {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);

    return await Booking.countDocuments({ clientId, expertId, createdAt: { $gte: startOfWeek } });
};




const booking = async ({ clientId, expertId, date, time }) => {
    try {

        const weeklyBookings = await checkWeeklyLimit(clientId, expertId);
        if (weeklyBookings >= 3) {
            return {
                status: false,
                message: "You cannot book more than 3 slots with this expert in a week."
            }
        }

        const bookingDate = new Date(date);
        const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 6 = Saturday

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return {
                status: false,
                message: "Bookings are not allowed on weekends (Saturday and Sunday)."
            }
        }

        const slot = await Slot.findOneAndUpdate(
            {
                expertId: new mongoose.Types.ObjectId(expertId),
                date: new Date(date),
                startTime: new Date(`${date}T${time}`),
                isBlocked: false,
                isFull: false,
            },
            // {
            //     $set: { isFull: true } // Temporarily marked as full to prevent race conditions
            // },
            {
                new: true
            }
        );
        if (!slot) {
            return {
                status: false,
                message: "Slot does not exist.",
            };
        }
        const totalBookings = await Booking.countDocuments({ slotId: slot._id });

        if (totalBookings >= slot.totalCapacity) {
            // If total bookings reach slot capacity, mark the slot as full
            await Slot.findByIdAndUpdate(slot._id, { isFull: true });
            return {
                status: false,
                message: "This slot is fully booked. Please choose another slot.",
            };
        }
        const existingBooking = await Booking.findOne({
            clientId: clientId,
            slotId: slot._id
        });

        if (existingBooking) {
            await Slot.findByIdAndUpdate(slot._id, { isFull: false });
            return {
                status: false,
                message: "You have already booked this slot.",
            };
        }




        const bookSlot = await Booking.create({
            expertId: expertId,
            clientId: clientId,
            slotId: slot._id,

        })

        // const ttl = bookSlot.gracePeriod * 60; 
        // const redisKey = `booking:noshow:${bookSlot._id}`
        // await redis.setex(redisKey, ttl, JSON.stringify({ bookingId: bookSlot._id }));


        const updatedSlot = await Slot.findByIdAndUpdate(slot._id, {
            $push: { bookings: bookSlot._id },
            $inc: { bookedCount: 1 }
        }, { new: true })


        // Only mark the slot as full if the total bookings now equal the total capacity
        if (updatedSlot.bookedCount >= updatedSlot.maxBookings) {
            await Slot.findByIdAndUpdate(slot._id, { isFull: true });
        }

        return {
            status: true,
            message: "Booking created successfully.",
            data: bookSlot,
        };

    } catch (error) {
        console.error("Error Booking slot", error)
    }
}

const checkedInClient = async ({ clientId, bookingId }) => {
    try {
        const booking = await Booking.findById(new mongoose.Types.ObjectId(bookingId))
        if (!booking) {
            return {
                status: false,
                message: "no booking found",
                data: {}
            }
        }
        if (booking.status === "attended") {
            return {
                status: false,
                message: "You have already checked-in",
                data: {}
            }
        }
        if (booking.status === 'no-show') {
            return {
                status: false,
                message: "The booking already marked as no-show",
                data: {}
            }
        }
        booking.checkInTime = new Date()
        booking.status = "attended"
        await booking.save();

        return {
            status: true,
            message: "Client succecfully checked-in",
            data: { booking }
        }
    } catch (error) {
        // console.error("Error checking in Client :", error);
        throw new Error("Error checking in client: " + error);
    }
}


const checkBookingStatus = async (booking) => {
    try {
        const now = new Date();
        const gracePeriodEnd = new Date(booking.createdAt.getTime() + booking.gracePeriod * 60000);
        const checkInExpired = !booking.checkInTime && now > gracePeriodEnd;

        if (checkInExpired) {
            booking.status = 'no-show';
            await booking.save();
            // const slot = await Slot.findById(booking?.slotId);

            // if (slot && slot.bookings) {

            //     slot.bookings = slot.bookings.filter(id => id.toString() !== booking._id.toString());
            //     slot.bookedCount = slot.bookedCount - 1
            //     if (slot.isFull) {
            //         slot.isFull = false
            //     }
            //     await slot.save();
            // }
            // // Optionally, delete the booking after no-show
            // await Booking.deleteOne({ _id: booking._id }); // Corrected deletion method
        }
    } catch (error) {
        console.error(error)
    }
};


const checkExpiredBookings = async () => {
    try {
        const expiredBookings = await Booking.find({
            status: 'booked',
            checkInTime: { $eq: null },
            createdAt: { $lte: new Date(new Date().getTime() - 15 * 60000) },
        });
        console.log("expiredBookings",expiredBookings)
        expiredBookings.forEach(async (booking) => {
            await checkBookingStatus(booking);
        });
    } catch (error) {
        console.error(error)
    }
};


const autoCancelation = async (booking) => {
    try {
        const now = new Date()
        const gracePeriodEnd = new Date(booking.updatedAt.getTime() + booking.gracePeriod * 60000);
        const checkInExpired = !booking.checkInTime && now > gracePeriodEnd;
        if (checkInExpired) {
            booking.status = 'cancelled';
            await booking.save();
        }
    } catch (error) {
        console.error(error)
    }
}

const checkAutoCancelation = async () => {
    try {
        const no_ShowBookings = await Booking.find({
            status: 'no-show',
            checkInTime: { $eq: null },
            updatedAt: { $lte: new Date(new Date().getTime() - 15 * 60000) },
        });
        console.log("noshow bookings",no_ShowBookings)
        no_ShowBookings.forEach(async (booking) => {
            await autoCancelation(booking)
        })
    } catch (error) {
        console.error(error)
    }
}

cron.schedule('* * * * *', () => {
    checkAutoCancelation()
    checkExpiredBookings()
});


// Todo : recommandation => from current date to next day.
const recommendations = async () => {
    try {
        let slots

        const cacheKey = `recommendations`;
        let cachedRecommendations = await redis.get(cacheKey)
        if (cachedRecommendations) {
            return JSON.parse(cachedRecommendations)
        }


        slots = await Slot.find({ isBlocked: false })
            .sort({ bookedCount: -1 }) // Sort by popularity (most booked)
            .select('-bookings -__v -createdAt -updatedAt')
            .lean();

        if (!slots) {
            return "No slots available for the selected date."
        }
        const availableSlots = slots.filter((slot) => slot.bookedCount < slot.maxBookings)
        if (!availableSlots.length) {
            return "All slots are fully booked"
        }
        const sortedSlots = availableSlots.sort((a, b) => b.bookedCount - a.bookedCount);


        const recommendations = sortedSlots.slice(0, 3);

        await redis.setex(cacheKey, 3600, JSON.stringify(recommendations));
        return recommendations
    } catch (error) {
        console.error("Error while recommending ", error)
    }
}

const cancel_delete_Booking = async ({ clientId, bookingId }) => {
    try {

        const booking = await Booking.findById(bookingId)
        if (!booking) return {
            status: false,
            message: "Booking not found",
        };

        if (booking.clientId.toString() !== clientId.toString()) {
            return {
                status: false,
                message: "Unauthorized: You do not have permission to cancel this booking.",
            };
        }
        const slot = await Slot.findById(booking.slotId)


        if (!slot) return {
            status: false,
            message: "The slot associated with this booking was not found."
        }

        slot.bookings = slot.bookings.filter((id) => id.toString() !== bookingId.toString())
        slot.bookedCount = Math.max(slot.bookings.length, 0)
        slot.isFull = slot.bookedCount >= slot.maxBookings
        await slot.save()

        await Booking.findByIdAndDelete(bookingId)

        return {
            status: true,
            message: "Booking canceled succcessfully."
        }
    } catch (error) {
        throw new Error(error)

    }
}

const getAllBookings = async ({ clientId }) => {
    try {
        console.log(new Date(new Date().getTime()))
        const cacheKey = `clientBookings:${clientId.toString()}`;
        const cachedBookings = await redis.get(cacheKey);

        if (cachedBookings) {
            return {
                status: true,
                message: "All bookings fetched",
                data: JSON.parse(cachedBookings)
            }
        }
        const bookings = await Booking.find({ clientId: clientId }).select('-__v -createdAt -updatedAt')
        if (!bookings) return {
            status: false,
            message: "No bookings associated with provided client-Id ",
            data: {}
        }
        if (bookings) {
            const bookingsData = bookings.map((booking) => ({
                _id: booking._id,
                clientId: booking.clientId,
                expertId: booking.expertId,
                slotId: booking.slotId,
                status: booking.status,
                gracePeriod: booking.gracePeriod,
                checkInTime: booking.checkInTime
            }))
            await redis.setex(cacheKey, 1800, JSON.stringify(bookingsData));
            return {
                status: true,
                message: "All bookings fetched",
                data: bookingsData
            }
        }
    } catch (error) {
        throw new Error("Error while getting client bookings", error)
    }
}



module.exports = {
    booking,
    recommendations,
    cancel_delete_Booking,
    getAllBookings,
    checkedInClient,

}