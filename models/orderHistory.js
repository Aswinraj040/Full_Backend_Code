//orderHistory.js
const mongoose = require("mongoose");

// Function to get the current date and time in IST
function getISTTime() {
  const currentDateUTC = new Date(); // Current date in UTC
  const offsetIST = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
  return new Date(currentDateUTC.getTime() + offsetIST);
}

const orderItemHistorySchema = new mongoose.Schema({
  menuItem: { type: String, required: true },
  quantity: { type: Number, required: true },
  individual_price: { type: Number, required: true },
  total_price: { type: Number, required: true }, 
});

const orderHistorySchema = new mongoose.Schema({
  unique_order_id: { type: String, required: true, unique: true },
  time: { type: Date, default: getISTTime },
  tableNumber: { type: String, required: true },
  member_id: { type: String, required: true },
  items: [orderItemHistorySchema],
  final_price: { type: Number, required: true }, // Ensure this is defined
});

const OrderHistory = mongoose.model("OrderHistory", orderHistorySchema);

module.exports = OrderHistory;
