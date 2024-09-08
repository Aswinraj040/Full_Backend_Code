//ordersController.js
const Order = require('../models/order');
const OrderHistory = require('../models/orderHistory');
const billGenerator = require('../utils/billGenerator');
const notificationService = require('../services/notificationService');
const paymentService = require('../services/paymentService');

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ time: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order by unique_order_id
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ unique_order_id: req.params.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.closeOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ unique_order_id: req.params.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Generate final price and save to order history
    const totalAmount = billGenerator.calculateTotalAmount(order.items);
    await OrderHistory.create({
      unique_order_id: order.unique_order_id,
      time: order.time,
      tableNumber: order.tableNumber,
      items: order.items,
      final_price: totalAmount,
    });

    // Remove the order from the Order collection
    await Order.deleteOne({ unique_order_id: order.unique_order_id });

    // Send notification based on payment method
   // if (req.body.paymentMethod === 'credit') {
   //   notificationService.sendCreditNotification(order);
   // } else if (req.body.paymentMethod === 'online') {
   //   paymentService.sendPaymentLink(order);
   // }

    res.json({ message: 'Order closed', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
