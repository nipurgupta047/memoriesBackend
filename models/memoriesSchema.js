const mongoose = require('mongoose')

const memorySchema = new mongoose.Schema({

    imageUrl: {
        type: String,
        required: true
    },
    place: {
        type: String,
        required: true
    },
    desc: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    imagePublicId: {
        type: String,
        required: true
    }

})

module.exports = mongoose.model('memory', memorySchema);

