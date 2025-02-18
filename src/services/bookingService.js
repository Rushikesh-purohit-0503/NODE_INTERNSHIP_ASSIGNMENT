const Slot = require('../models/expertSlotModel')
const Booking = require('../models/bookingModel')
const { default: mongoose } = require('mongoose')
const { redis } = require('../utils/Redis')
const { MAX_CONCURRENT_BOOKINGS } = require('../constants/user_constants')
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
        
        const taskId = `${clientId}-${expertId}-${date}-${time}`;  
        const queueKey = `expert:${expertId}:queue`;

       
        await redis.lpush(queueKey, taskId);

        
        const currentConcurrency = await redis.get(`expert:${expertId}:concurrency`);
        if (currentConcurrency >= MAX_CONCURRENT_BOOKINGS) {
           
            return {
                status: false,
                message: "Too many bookings are being processed for this expert. Please try again later."
            };
        }

        
        await redis.incr(`expert:${expertId}:concurrency`);
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
        await redis.decr(`expert:${expertId}:concurrency`);
        await redis.lrem(`expert:${expertId}:concurrency`);
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
        // const now = new Date();


        // const slot = await Slot.findById(booking.slotId);
        // if (!slot || !slot.startTime) return;


        // const slotStartTime = new Date(slot.startTime);
        // const gracePeriodEnd = new Date(slotStartTime.getTime() + booking.gracePeriod * 60000);

        // const checkInExpired = !booking.checkInTime && now > gracePeriodEnd;

        // if (checkInExpired) {
        booking.status = 'no-show';
        await booking.save();


        // if (slot.bookings) {
        //     slot.bookings = slot.bookings.filter(id => id.toString() !== booking._id.toString());
        //     slot.bookedCount = Math.max(slot.bookedCount - 1, 0);

        //     if (slot.isFull) {
        //         slot.isFull = false;
        //     }

        //     await slot.save();
        // }
        // }
    } catch (error) {
        console.error(error)
    }
};

const checkExpiredBookings = async () => {
    try {
        const now = new Date(new Date().getTime() + 19800000);

        const noShowBookings = await Booking.find({
            status: 'booked',
            checkInTime: { $eq: null },
        }).populate('slotId');

        const filteredBookings = noShowBookings.filter(booking => {
            if (!booking.slotId || !booking.slotId.startTime) { return false };
            const slotStartTime = new Date(booking.slotId.startTime);
            const gracePeriodEnd = new Date(slotStartTime.getTime() + 19800000 + booking.gracePeriod * 60000);
            console.log(gracePeriodEnd)
            console.log("now", now)
            console.log(now > gracePeriodEnd)
            return now > gracePeriodEnd;
        });

        console.log("Expired Bookings:", filteredBookings);

        for (const booking of filteredBookings) {
            await checkBookingStatus(booking);
        }
    } catch (error) {
        console.error(error);
    }
};

const autoCancelation = async (booking) => {
    try {
        // const now = new Date()


        const slot = await Slot.findById(booking.slotId);
        if (!slot || !slot.startTime) return;


        // const slotStartTime = new Date(slot.startTime);
        // const gracePeriodEnd = new Date(slotStartTime.getTime() + booking.gracePeriod  * 60000);

        // const checkInExpired = !booking.checkInTime && now > gracePeriodEnd;

        // if (checkInExpired) {
        booking.status = 'cancelled';
        await booking.save();


        if (slot.bookings) {
            slot.bookings = slot.bookings.filter(id => id.toString() !== booking._id.toString());
            slot.bookedCount = Math.max(slot.bookedCount - 1, 0);

            if (slot.isFull) {
                slot.isFull = false;
            }

            await slot.save();
        }
        // }
    } catch (error) {
        console.error(error)
    }
}

const checkAutoCancelation = async () => {
    try {
        const now = new Date(new Date().getTime() + 19800000);
        const noShowBookings = await Booking.find({
            status: 'no-show',
            checkInTime: { $eq: null },
        }).populate('slotId');
        const filteredBookings = noShowBookings.filter(booking => {
            if (!booking.slotId || !booking.slotId.startTime) { return false };
            const slotStartTime = new Date(booking.slotId.startTime);
            const gracePeriodEnd = new Date(slotStartTime.getTime() + 19800000 + booking.gracePeriod * 60000);

            return now > gracePeriodEnd;
        });
        console.log("noshow bookings", filteredBookings)
        for (const booking of filteredBookings) {
            await autoCancelation(booking);
        }
    } catch (error) {
        console.error(error)
    }
}

cron.schedule('*/15 * * * *', () => {
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
        // Check if the booking data is cached in Redis
        let cachedBooking = await redis.get(`booking:${bookingId}`);
        if (cachedBooking) {
            cachedBooking = JSON.parse(cachedBooking);
        } else {
            const booking = await Booking.findById(bookingId);

            if (!booking) {
                return {
                    status: false,
                    message: "Booking not found",
                };
            }

            if (booking.clientId.toString() !== clientId.toString()) {
                return {
                    status: false,
                    message: "Unauthorized: You do not have permission to cancel this booking.",
                };
            }


            await redis.setex(`booking:${bookingId}`, 3600, JSON.stringify(booking));

            cachedBooking = booking;
        }


        let cachedSlot = await redis.get(`slot:${cachedBooking.slotId}`);
        if (cachedSlot) {
            cachedSlot = JSON.parse(cachedSlot);
        } else {
            const slot = await Slot.findById(cachedBooking.slotId);
            if (!slot) {
                return {
                    status: false,
                    message: "The slot associated with this booking was not found."
                };
            }


            await redis.setex(`slot:${cachedBooking.slotId}`, 3600, JSON.stringify(slot));

            cachedSlot = slot;
        }


        cachedSlot.bookings = cachedSlot.bookings.filter((id) => id.toString() !== bookingId.toString());
        cachedSlot.bookedCount = Math.max(cachedSlot.bookings.length, 0);
        cachedSlot.isFull = cachedSlot.bookedCount >= cachedSlot.maxBookings;


        await Slot.findByIdAndUpdate(cachedSlot._id, {
            bookings: cachedSlot.bookings,
            bookedCount: cachedSlot.bookedCount,
            isFull: cachedSlot.isFull
        });

        await Booking.findByIdAndDelete(bookingId);


        await redis.del(`booking:${bookingId}`);
        await redis.setex(`slot:${cachedSlot._id}`, 3600, JSON.stringify(cachedSlot)); // Update the slot cache

        return {
            status: true,
            message: "Booking canceled successfully."
        };
    } catch (error) {
        console.error("Error while canceling or deleting booking:", error);
        throw new Error("Error while canceling or deleting booking: " + error);
    }
};

const getAllBookings = async ({ clientId }) => {
    try {
        // console.log(new Date(new Date().getTime()))
        const cacheKey = `clientBookings:${clientId.toString()}`;
        const cachedBookings = await redis.get(cacheKey);

        if (cachedBookings) {
            return {
                status: true,
                message: "All bookings fetched",
                data: JSON.parse(cachedBookings)
            }
        }
        const bookings = await Booking.find({ clientId: clientId, status: 'booked' }).select('-__v -createdAt -updatedAt')
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