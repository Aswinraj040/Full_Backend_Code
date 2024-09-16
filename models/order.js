//order.js
const mongoose = require("mongoose");

// Function to get the current date and time in IST
function getISTTime() {
  const currentDateUTC = new Date(); // Current date in UTC
  const offsetIST = 5.5 * 60 * 60 * 1000; // IST is UTC + 5:30
  return new Date(currentDateUTC.getTime() + offsetIST);
}

const orderItemSchema = new mongoose.Schema({
  menuItem: { type: String, required: true },
  quantity: { type: Number, required: true },
  individual_price: { type: Number, required: true },
  total_price: { type: Number, required: true }, // Add total_price here
});

orderItemSchema.pre("validate", function (next) {
  if (this.isModified("quantity") || this.isModified("individual_price")) {
    this.total_price = this.quantity * this.individual_price;
  }
  next();
});

const orderSchema = new mongoose.Schema({
  unique_order_id: { type: String, required: true, unique: true },
  time: { type: Date, default: getISTTime },
  tableNumber: { type: String, required: true },
  member_id: { type: String, required: true },
  items: [orderItemSchema],
  final_price: { type: Number },
  isClosed: { type: Boolean, default: false },
  isUpdated: { type: Boolean, default: false },
  remarks : { type : String , required : false}
});

orderSchema.pre("save", function (next) {
  if (this.isClosed) {
    this.final_price = this.items.reduce(
      (acc, item) => acc + item.total_price,
      0
    );
  }
  next();
});

orderSchema.methods.closeOrder = function () {
  this.isClosed = true;
  this.final_price = this.items.reduce(
    (acc, item) => acc + item.total_price,
    0
  );
  return this.save();
};

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;