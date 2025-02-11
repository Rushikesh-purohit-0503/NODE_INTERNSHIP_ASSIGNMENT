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
            enum: ['booked', 'cancelled', 'completed', 'no-show'],
            default: 'booked'
        },
        gracePeriod:{
            type: String,
            default: 15
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
