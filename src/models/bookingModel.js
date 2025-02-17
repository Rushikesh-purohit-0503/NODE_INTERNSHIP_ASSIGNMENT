const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
    {
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        expertId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        slotId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Slot',
            required: true
        },
        status: {
            type: String,
            enum: ['booked', 'attended', 'no-show'],
            default: 'booked'
        },
        gracePeriod:{
            type: Number,
            default: 15
        },
        checkInTime: {
            type: Date,
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now()
        }
    },
    { timestamps: true }
);

// Restrict a client to max 3 bookings per expert per week
BookingSchema.index({ clientId: 1, expertId: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
