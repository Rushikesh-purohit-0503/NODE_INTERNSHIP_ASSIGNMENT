const Slot = require('../models/expertSlotModel')
const Booking = require('../models/bookingModel');
const { default: mongoose } = require('mongoose');
const { RRule } = require('rrule');
const { redis } = require('../utils/Redis');

const createSlots = async ({ expertId, date, startTime, endTime, slotDuration, recurring }) => {
    // Validate slot duration
    if (![15, 30, 60].includes(slotDuration)) {
        throw new Error("Invalid slot duration. Only 15, 30, or 60 minutes are allowed.");
    }

    // Check for overlapping slots
    const overlappingSlots = await Slot.find({
        expertId,
        date,
        $or: [
            { startTime: { $lt: endTime, $gte: startTime } },
            { endTime: { $gt: startTime, $lte: endTime } },
        ],
    });

    if (overlappingSlots.length) {
        throw new Error("Overlapping slots are not allowed.");
    }


    // Handle recurring slots
    if (recurring) {
        const givenDate = new Date(date);


        // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
        // const dayOfWeek = givenDate.getDay();
        // console.log(typeof dayOfWeek)

        // if (dayOfWeek === 6) {
        //     givenDate.setDate(givenDate.getDate() + 2); // If Saturday, move to Monday
        // } else if (dayOfWeek === 0) {
        //     givenDate.setDate(givenDate.getDate() + 1); // If Sunday, move to Monday
        // }


        // Define the recurrence rule for the next 5 occurrences
        const rule = new RRule({
            freq: RRule.WEEKLY, // Weekly recurrence
            interval: 1, // Every week
            count: 5, // 5 occurrences
            dtstart: givenDate, // Start date
        });

        // Generate recurring dates
        const recurringDates = rule.all(); // Array of dates

        // Convert the recurring dates into slot objects
        const recurringSlots = recurringDates.map((occurrenceDate) => ({
            expertId,
            date: occurrenceDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
            isRecurring: recurring,
            startTime,
            endTime,
            slotDuration,
        }));

        // Check for conflicts with existing slots
        const slotConflicts = await Slot.find({
            expertId,
            date: { $in: recurringSlots.map((slot) => slot.date) }, // Check for all recurring dates
            $or: [
                { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
            ],
        });

        if (slotConflicts.length) {
            throw new Error("Conflicts found with recurring slots. Please adjust your schedule.");
        }
        const result = await Slot.insertMany(recurringSlots);

        return { result };
    }

    // Create single slot
    const newSlot = await Slot.create({
        expertId,
        date,
        startTime,
        endTime,
        slotDuration,
    });

    return newSlot;
};


const deleteSlots = async ({ expertId, startDate, endDate }) => {
    try {
        const result = await Slot.deleteMany({
            expertId,
            date: { $gte: startDate, $lte: endDate },
        });

        return result;
    } catch (error) {
        console.error("Error while deleting slots", error)
    }
};


const getAllSlots = async ({ expertId }) => {
    try {
        const slots = await Slot.find({
            expertId: new mongoose.Types.ObjectId(expertId),
            isBlocked: false
        });
        // Format response
        if (slots) {
            const availableSlots = []
            const bookedSlots = []
            const expert_id = new mongoose.Types.ObjectId(expertId).toString()
            const cacheKey = `availableSlots:${expert_id}`;
            let cachedAvailableSlots = await redis.get(cacheKey)
            if (cachedAvailableSlots) {
                return {
                    status: true,
                    availableSlots: JSON.parse(cachedAvailableSlots),
                 
                }
            }
            slots.forEach(
                (slot) => {
                    const isFull = slot.bookings.length >= slot.maxBookings
                    const formattedSlot = {
                        _id: slot._id,
                        date: slot.date,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        slotDuration: slot.slotDuration,
                        isFull: slot.bookings.length >= slot.maxBookings,
                        bookings: slot.bookings,
                        isReCurring: slot.isRecurring,
                    }

                    if (isFull) {
                        bookedSlots.push(formattedSlot)
                    } else {
                        availableSlots.push(formattedSlot)
                    }

                }
            )
            await redis.setex(cacheKey, 3600, JSON.stringify(availableSlots))
            return {
                status: true,
                availableSlots: availableSlots,
                bookedSlots: bookedSlots
            }
        } else return {
            status: false,
            message: "there are no slot created by you"
        }
    } catch (error) {
        console.error("Error while getting all slots", error)
    }
};

const updateRecurringSlots = async ({
    expertId,
    slotId = {},
    startDate,
    newStartTime,
    newEndTime,
    slotDuration,
    recurringDays = [1, 2, 3, 4, 5] // Default to Mon-Fri 
}) => {
    // Validate inputs
    if ((newStartTime || newEndTime) &&
        new Date(`${startDate}T${newStartTime}`) >= new Date(`${startDate}T${newEndTime}`)) {
        throw new Error("Invalid timing. Start time must be before end time.");
    }


    // Validate slotId if provided
    if (slotId && !mongoose.Types.ObjectId.isValid(slotId)) {
        throw new Error("Invalid slotId format.");
    }


    /** if the slotId is provided then only that slot is updated **/
    // console.log(slotId.toString())
    if (slotId) {
        // Update a single slot if slotId is provided
        const slot = await Slot.findOne({ _id: slotId, expertId: expertId });

        if (!slot) {
            throw new Error("Slot not found.");
        }

        // Validate that the slot is recurring
        if (!slot.isRecurring) {
            throw new Error("The specified slot is not recurring.");
        }

        // Check for conflicts with other slots
        const conflict = await Slot.findOne({
            expertId,
            date: slot.date,
            $or: [
                { startTime: { $lt: newEndTime }, endTime: { $gt: newStartTime } },
            ],
            _id: { $ne: slotId }, // Exclude the current slot being updated
        });

        if (conflict) {
            throw new Error("Conflicts found with the updated schedule. Please adjust.");
        }

        // Update the single slot
        const updatedSlot = await Slot.findByIdAndUpdate(
            slotId,
            {
                ...(newStartTime && { startTime: newStartTime }),
                ...(newEndTime && { endTime: newEndTime }),
                ...(slotDuration && { slotDuration }),
            },
            { new: true }
        );

        return { message: "Slot updated successfully.", updatedSlot };
    }

    // Fetch all recurring slots starting from the given date and matching the criteria
    const recurringSlots = await Slot.find({
        expertId,
        isRecurring: true, // Only fetch recurring slots
        date: { $gte: startDate }, // Slots starting from the given date
    }).lean();

    // Filter slots to match the recurring days
    const filteredSlots = recurringSlots.filter((slot) => {
        const dayOfWeek = new Date(slot.date).getDay(); // Get the day of the week
        return recurringDays.includes(dayOfWeek); // Match with allowed recurring days
    });

    if (!filteredSlots.length) {
        return { message: "No recurring slots found." };
    }

    if (!newStartTime && !newEndTime && !slotDuration) {
        // If no new timing or duration provided, delete recurring slots (skip them)
        await Slot.deleteMany({ _id: { $in: recurringSlots.map((slot) => slot._id) } });
        return { message: "Recurring slots skipped successfully." };
    }

    // Check for conflicts if updating slots
    const conflict = await Slot.findOne({
        expertId,
        date: { $in: recurringSlots.map((slot) => slot.date) },
        $or: [
            { startTime: { $lt: newEndTime }, endTime: { $gt: newStartTime } },
        ],
        _id: { $nin: recurringSlots.map((slot) => slot._id) }, // Exclude current recurring slots
    });

    if (conflict) {
        throw new Error("Conflicts found with the updated schedule. Please adjust.");
    }

    // Update only the filtered slots
    const updatePromises = filteredSlots.map((slot) =>
        Slot.updateOne(
            { _id: slot._id },
            {
                ...(newStartTime && { startTime: newStartTime }),
                ...(newEndTime && { endTime: newEndTime }),
                ...(slotDuration && { slotDuration }),
            }
        )
    );

    await Promise.all(updatePromises);

    return { message: `${filteredSlots.length} recurring slots updated successfully.` };
}

module.exports = {
    getAllSlots,
    deleteSlots,
    createSlots,
    updateRecurringSlots
}