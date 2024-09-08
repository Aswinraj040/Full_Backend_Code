// models/paymentHistory.js
const mongoose = require('mongoose');

// Function to get the current date and time in IST
function getISTTime() {
  const currentDateUTC = new Date(); // Current date in UTC
  const offsetIST = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
  return new Date(currentDateUTC.getTime() + offsetIST);
}

const paymentHistorySchema = new mongoose.Schema({
  unique_order_id: { type: String, required: true },
  member_id: { type: String, required: true },
  final_price: { type: Number, required: true },
  payment_method: { type: String, required: true },
  payment_time: { type: Date, default: getISTTime }
});

const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);

module.exports = PaymentHistory;
