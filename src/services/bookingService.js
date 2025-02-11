const Slot = require('../models/expertSlotModel')
const Booking = require('../models/bookingModel')
const { default: mongoose } = require('mongoose')


const booking = async ({ clientId, expertId, date, time }) => {
    try {
        await autoCancelNoShowBookings()
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

        // // Check if the slot is blocked or full
        // if (slot.isBlocked) {
        //     return "Slot is unavailable.";
        // }

        const existingBooking = await Booking.findOne({
            clientId: clientId,
            slotId: slot._id
        });

        if (existingBooking) {
            await Slot.findByIdAndUpdate(slot._id, { isFull: false });
            return "You have already booked this slot.";
        }

        // const freshSlot = await Slot.findById(slot._id);
        // if (freshSlot.isFull) {
        //     return "Slot became full while booking. Please choose another slot.";
        // }

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

// const markSlotsAsFull = async (slotId) => {
//     const slot = await Slot.findById(slotId);
//     if (slot.bookings.length >= 5) {
//         slot.isFull = true;
//         await slot.save();
//     };
// }



const autoCancelNoShowBookings = async () => {
    try {
        const now = new Date();

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


const recommendations = async ({ expertId,  date}) => {
    try {
        let slots
        if (expertId && date) {
            // Case 1: Both expertId and date are provided
            slots = await Slot.find({ expertId, date:date, isBlocked: false }).select('-bookings -__v -createdAt -updatedAt').lean();
              

        } else if (expertId) {
            // Case 2: Only expertId is provided, fetch slots for the nearest available date
            slots = await Slot.find({ expertId, isBlocked: false })
                .sort({ date: 1, startTime: 1 }) // Sort by nearest date and startTime
                .select('-bookings -__v -createdAt -updatedAt')
                .lean(); 
        } else if (date) {
            // Case 3: Only date is provided, fetch slots across all experts for the date
            slots = await Slot.find({ date, isBlocked: false }).select('-bookings -__v -createdAt -updatedAt').lean();
            console.log(date) 
        } else {
            // Case 4: No filters provided, fetch popular slots across all experts
            slots = await Slot.find({ isBlocked: false })
                .sort({ bookedCount: -1 }) // Sort by popularity (most booked)
                .select('-bookings -__v -createdAt -updatedAt')
                .lean();
            console.log("fourth")
        }
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

        return recommendations
    } catch (error) {
        console.error("Error while recommending ", error)
    }
}
module.exports = {
    booking,
    recommendations
}