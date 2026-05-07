const mongoose = require("mongoose");

async function connectDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDb connected successfully");
  } catch (error) {
    console.log("error connection database", error.message);
    process.exit(1);
  }
}

module.exports = connectDb;
