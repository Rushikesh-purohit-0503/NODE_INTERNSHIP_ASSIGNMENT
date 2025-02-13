const Slot = require('../models/expertSlotModel')
const Booking = require('../models/bookingModel');
const { default: mongoose } = require('mongoose');
const { RRule } = require('rrule');
const { redis } = require('../utils/Redis');

const createSlots = async ({
    expertId,
    date,
    frequency,
    startTime,
    endTime,
    slotDuration,
    recurring,
    slotSize,
    occurenceCount
}) => {
    try {
        // Validate slot duration
        if (![15, 30, 60].includes(slotDuration)) {
            throw new Error("Invalid slot duration. Only 15, 30, or 60 minutes are allowed.");
        }

        // Combine date and time into Date objects for proper handling
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        if (startDateTime >= endDateTime) {
            throw new Error("Start time must be earlier than end time.");
        }

        // Check for overlapping slots
        const overlappingSlots = await Slot.find({
            expertId,
            $or: [
                { startTime: { $lt: endDateTime }, endTime: { $gt: startDateTime } }
            ],
        });

        if (overlappingSlots.length) {
            throw new Error("Overlapping slots are not allowed.");
        }

        // Handle recurring slots
        if (recurring) {
            const givenDate = new Date(date);

            const rule = new RRule({
                freq: RRule[frequency],
                interval: 1,
                count: occurenceCount,
                dtstart: givenDate,
            });

            // Generate recurring dates
            const recurringDates = rule.all(); // Array of dates

            // Convert the recurring dates into slot objects with combined date-time
            const recurringSlots = recurringDates.map((occurrenceDate) => {
                const startRecurringDateTime = new Date(
                    `${occurrenceDate.toISOString().split('T')[0]}T${startTime}`
                );
                const endRecurringDateTime = new Date(
                    `${occurrenceDate.toISOString().split('T')[0]}T${endTime}`
                );

                return {
                    expertId,
                    date: occurrenceDate.toISOString().split('T')[0], 
                    isRecurring: recurring,
                    startTime: startRecurringDateTime,
                    endTime: endRecurringDateTime,
                    slotDuration,
                    maxBookings: slotSize,
                };
            });

            // Check for conflicts in recurring slots
            const slotConflicts = await Slot.find({
                expertId,
                $or: recurringSlots.map((slot) => ({
                    startTime: { $lt: slot.endTime },
                    endTime: { $gt: slot.startTime },
                })),
            });

            if (slotConflicts.length) {
                throw new Error("Conflicts found with recurring slots. Please adjust your schedule.");
            }

            const result = await Slot.insertMany(recurringSlots);

            if (!result) {
                return {
                    status: false,
                    message: "New slots are not created.",
                    data: {},
                };
            }
            return {
                status: true,
                message: "New recurring slots created successfully.",
                data: { result },
            };
        }

        // Create a single slot with combined date-time
        const newSlot = await Slot.create({
            expertId,
            date,
            startTime: startDateTime,
            endTime: endDateTime,
            slotDuration,
            maxBookings: slotSize,
        });

        if (!newSlot) {
            return {
                status: false,
                message: "New slot is not created.",
                data: {},
            };
        }
        return {
            status: true,
            message: "New slot created successfully.",
            data: { newSlot },
        };
    } catch (error) {
        console.error(error);
        throw new Error("Error creating slot: " + error.message);
    }
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
    slotId,
    startDate,
    newStartTime,
    newEndTime,
    slotDuration,
    recurringDays = [1, 2, 3, 4, 5] // Default to Mon-Fri 
}) => {
    try {
        // Validate inputs

        if ((newStartTime || newEndTime) &&
            new Date(`${startDate}T${newStartTime}`) >= new Date(`${startDate}T${newEndTime}`)) {
            throw new Error("Invalid timing. Start time must be before end time.");
        }

        // console.log("fdas",slotId)
        // Validate slotId if provided



        if (slotId) {
            // Update a single slot if slotId is provided
            const slot = await Slot.findOne({ _id: new mongoose.Types.ObjectId(slotId), expertId: expertId });

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

            return {
                status: true,
                message: "Slot updated successfully.",
                data: { updatedSlot }
            };
        }

        // Fetch all recurring slots starting from the given date and matching the criteria
        const recurringSlots = await Slot.find({
            expertId,
            isRecurring: true,
            date: { $gte: startDate },
        }).lean();


        const filteredSlots = recurringSlots.filter((slot) => {
            const dayOfWeek = new Date(slot.date).getDay();
            return recurringDays.includes(dayOfWeek);
        })

        if (!filteredSlots.length) {
            return { status: false, message: "No recurring slots found.", data: {} };
        }

        if (!newStartTime && !newEndTime && !slotDuration) {
            // If no new timing or duration provided, delete recurring slots (skip them)
            const recurringSlotIds = recurringSlots.map((slot) => slot._id)
            await Slot.deleteMany({ _id: { $in: recurringSlotIds } });
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


        const updatePromises = filteredSlots.map((slot) =>
            Slot.findOneAndUpdate(
                { _id: slot._id },
                {
                    ...(newStartTime && { startTime: newStartTime }),
                    ...(newEndTime && { endTime: newEndTime }),
                    ...(slotDuration && { slotDuration }),
                }
            )
        );

        const updatedSlots = await Promise.all(updatePromises)
        const result = updatedSlots.map((slot) => [{
            _id: slot._id,
            expertId: slot.expertId,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            slotDuration: slot.slotDuration,
            maxBookings:slot.maxBookings,
            
        }])

        return {
            status: true,
            message: "The slots are updated succesfully",
            data: { result }
        }
    } catch (error) {
        console.error("Error while calculating total bookings:", error);

        throw new Error("Error while updating slots", error)
    }
}

module.exports = {
    getAllSlots,
    deleteSlots,
    createSlots,
    updateRecurringSlots
}