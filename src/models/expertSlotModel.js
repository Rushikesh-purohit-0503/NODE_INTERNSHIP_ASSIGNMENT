const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema(
    {
        expertId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        startTime: {
            type: String,
            required: true
        },
        endTime: {
            type: String,
            required: true
        },
        slotDuration: {
            type: Number,
            enum: [15, 30, 60],
            required: true
        },
        maxBookings: {
            type: Number,
            default: 5
        },
        isFull: {
            type: Boolean,
            default: false
        },
        isBlocked: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Prevent overlapping slots for an expert
SlotSchema.index({ expertId: 1, date: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model('Slot', SlotSchema);
