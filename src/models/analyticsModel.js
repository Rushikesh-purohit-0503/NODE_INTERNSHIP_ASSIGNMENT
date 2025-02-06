const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema(
    {
        expertId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        totalBookings: { type: Number, default: 0 },
        noShows: { type: Number, default: 0 },
        utilizationRate: { type: Number, default: 0 } // Percentage of slots filled
    },
    { timestamps: true }
);

module.exports = mongoose.model('Analytics', AnalyticsSchema);
