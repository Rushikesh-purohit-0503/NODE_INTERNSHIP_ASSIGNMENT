const Slot = require('../models/expertSlotModel')
const Booking = require('../models/bookingModel')
const { default: mongoose } = require('mongoose')
const { redis } = require('../utils/Redis')

const booking = async ({ clientId, expertId, date, time }) => {
    try {

        const startOfWeek = new Date();
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Start of the week (Monday)

        // Check existing bookings for the same client and expert this week
        const weeklyBookings = await Booking.countDocuments({
            clientId,
            expertId,
            createdAt: { $gte: startOfWeek },
        });

        if (weeklyBookings >= 3) {
            return "You cannot book more than 3 slots with this expert in a week.";
        }

        const bookingDate = new Date(date);
        const dayOfWeek = bookingDate.getDay(); // 0 = Sunday, 6 = Saturday

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return 'Bookings are not allowed on weekends (Saturday and Sunday).'
        }
        const slot = await Slot.findOneAndUpdate(
            {
                expertId: new mongoose.Types.ObjectId(expertId),
                date: date,
                startTime: time,
                isBlocked: false,
                isFull: false,
            },
            {
                $set: { isFull: true } // Temporarily mark as full to prevent race conditions
            },
            {
                new: true
            }
        );
        if (!slot) {
            return "Slot does not exist.";
        }
        const existingBooking = await Booking.findOne({
            clientId: clientId,
            slotId: slot._id
        });

        if (existingBooking) {
            await Slot.findByIdAndUpdate(slot._id, { isFull: false });
            return "You have already booked this slot.";
        }

       

        const bookSlot = await Booking.create({
            expertId: expertId,
            clientId: clientId,
            slotId: slot?._id,

        })

        // Update the bookings array in the slot schema
        await Slot.findByIdAndUpdate(slot._id, {
            $push: { bookings: bookSlot._id },
            $inc: { bookedCount: 1 }
        })

        // Recalculate if the slot is actually full
        const totalBookings = await Booking.countDocuments({ slotId: slot._id });
        if (totalBookings >= 5) {
            await Slot.findByIdAndUpdate(slot._id, { isFull: true });
        } else {
            // If not full, undo the temporary marking
            await Slot.findByIdAndUpdate(slot._id, { isFull: false });
        }
        return bookSlot
    } catch (error) {
        console.error("Error Booking slot", error)
    }
}




const autoCancelNoShowBookings = async () => {
    try {
        const now = new Date();
        console.log(now)
        // Find all bookings where the grace period has passed
        const expiredBookings = await Booking.find({
            status: 'booked',
            $expr: {
                $lte: [
                    '$createdAt',
                    {
                        $subtract: [now, { $multiply: ['$gracePeriod', 60 * 1000] }], // Grace period in milliseconds
                    },
                ],
            },
        });

        for (const booking of expiredBookings) {
            // Mark the booking as 'cancelled'
            booking.status = 'cancelled';
            await booking.save();

            // Update the slot to make it available again
            await Slot.findByIdAndUpdate(booking.slotId, {
                $pull: { bookings: booking._id },
                isFull: false,
            });

            console.log(`Booking ${booking._id} auto-cancelled.`);
        }
    } catch (error) {
        console.error('Error in auto-cancelling bookings:', error);
    }
};


const recommendations = async ({ }) => {
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
        console.log("fourth")
   
        if (!slots) {
            return "No slots available for the selected date."
        }
        const availableSlots = slots.filter((slot) => slot.bookedCount < slot.maxBookings)
        if (!availableSlots.length) {
            return "All slots are fully booked for this date."
        }
        const sortedSlots = availableSlots.sort((a, b) => b.bookedCount - a.bookedCount);

        // Step 4: Return top 3 recommended slots
        const recommendations = sortedSlots.slice(0, 3);

        await redis.setex(cacheKey, 3600, JSON.stringify(recommendations));
        return recommendations
    } catch (error) {
        console.error("Error while recommending ", error)
    }
}

const cancelBooking = async ({ clientId, bookingId }) => {
    try {

        const booking = await Booking.findById(bookingId)
        if (!booking) return {
            success: false,
            message: "Booking not found",
        };

        if (booking.clientId.toString() !== clientId.toString()) {
            return {
                success: false,
                message: "Unauthorized: You do not have permission to cancel this booking.",
            };
        }
        const slot = await Slot.findById(booking.slotId)


        if (!slot) return {
            success: false,
            message: "The slot associated with this booking was not found."
        }

        slot.bookings = slot.bookings.filter((id) => id.toString() !== bookingId.toString())
        slot.bookedCount = Math.max(slot.bookings.length, 0)
        slot.isFull = slot.bookedCount >= slot.maxBookings
        await slot.save()

        await Booking.findByIdAndDelete(bookingId)

        return {
            success: true,
            message: "Booking canceled successfully."
        }
    } catch (error) {
        throw new Error(error)

    }
}

const getAllBookings = async ({ clientId }) => {
    try {

        const cacheKey = `clientBookings:${clientId.toString()}`;
        const cachedBookings = await redis.get(cacheKey);

        if (cachedBookings) {
            return JSON.parse(cachedBookings);
        }
        const bookings = await Booking.find({ clientId: clientId }).select('-__v -createdAt -updatedAt')
        if (!bookings) return {
            status: false,
            message: "No bookings associated with provided client-Id "
        }
        if (bookings) {
            const bookingsData = bookings.map((booking) => ({
                _id: booking._id,
                clientId: booking.clientId,
                expertId: booking.expertId,
                slotId: booking.slotId,
                status: booking.status,
                gracePeriod: booking.gracePeriod
            }))
            await redis.setex(cacheKey, 1800, JSON.stringify(bookingsData));
            return bookingsData;
        }
    } catch (error) {
        throw new Error("Error while getting client bookings", error)
    }
}
module.exports = {
    booking,
    recommendations,
    cancelBooking,
    getAllBookings
}