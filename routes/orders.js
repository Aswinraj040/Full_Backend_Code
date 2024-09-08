//orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const OrderHistory = require('../models/orderHistory');
const PaymentHistory = require('../models/paymentHistory');
const Dish = require('../server'); // Import Dish model
const MenuItem = require('../server'); // Import MenuItem model
const sendPaymentEmail = require('../services/OnlinePaymentEmail');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific order by unique_order_id
router.get('/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ unique_order_id: req.params.orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Close Order Endpoint
router.post('/close/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findOne({ unique_order_id: orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Calculate final price based on order items
    const finalPrice = order.items.reduce(
      (acc, item) => acc + item.total_price,
      0
    );
    
    // Move order to Order History
    const orderHistory = new OrderHistory({
      unique_order_id: order.unique_order_id,
      time: order.time,
      tableNumber: order.tableNumber,
      member_id: order.member_id,
      items: order.items,
      final_price: finalPrice,
    });

    await orderHistory.save();
    await Order.deleteOne({ unique_order_id: orderId });

    res.status(200).json({ message: 'Order closed and moved to history' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch order history by unique_order_id
router.get('/orderHistory/:orderId', async (req, res) => {
  try {
    console.log('Fetching order history for:', req.params.orderId);
    const order = await OrderHistory.findOne({ unique_order_id: req.params.orderId });
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found in history' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint to handle payment
router.post('/payment/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const { paymentMethod } = req.body;

  try {
    const order = await OrderHistory.findOne({ unique_order_id: orderId });
    if (!order) return res.status(404).json({ message: 'Order not found in history' });

    // Store payment history
    const paymentHistory = new PaymentHistory({
      unique_order_id: order.unique_order_id,
      member_id: order.member_id,
      final_price: order.final_price,
      payment_method: paymentMethod,
      payment_time: new Date()
    });
    await paymentHistory.save();

    // Handle different payment methods
    if (paymentMethod === 'cash') {
      return res.json({ message: 'Please pay the final amount in cash.' });
    } else if (paymentMethod === 'online') {
      sendPaymentEmail(order);
      return res.json({ message: 'Payment link has been sent to your email.' });
    } else if (paymentMethod === 'credit') {
      return res.json({ message: 'The final amount has been added to your credit limit.' });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Order Endpoint
router.put('/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const updates = req.body;

  try {
    const order = await Order.findOne({ unique_order_id: orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    Object.assign(order, updates);
    order.isUpdated = true;

    await order.save();

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint to reset isUpdated field
router.post('/reset-updates', async (req, res) => {
  const { orderIds } = req.body;

  try {
    if (!Array.isArray(orderIds)) {
      return res.status(400).json({ message: 'Invalid order IDs format' });
    }

    await Order.updateMany(
      { unique_order_id: { $in: orderIds } },
      { $set: { isUpdated: false } }
    );

    res.status(200).json({ message: 'Updates reset successfully' });
  } catch (error) {
    console.error('Error resetting updates:', error);
    res.status(500).json({ message: 'Error resetting updates' });
  }
});

// Create a new order
router.post('/create-order', async (req, res) => {
  const { unique_order_id, tableNumber, member_id, items } = req.body;

  const orderItems = items.map(item => ({
    menuItem: item.menuItem,
    quantity: item.quantity,
    individual_price: item.individual_price,
    total_price: item.quantity * item.individual_price
  }));

  try {
    const newOrder = new Order({
      unique_order_id,
      tableNumber,
      member_id,
      items: orderItems
    });

    await newOrder.save();

    res.status(201).json({ message: 'Order created successfully', order: newOrder });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all menu items
router.get('/menuitems', async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    const menuItemsWithImages = await Promise.all(menuItems.map(async (item) => {
      const dish = await Dish.findOne({ name: item.name });
      return {
        ...item.toObject(),
        image_path: dish ? dish.image_path : null,
      };
    }));
    res.status(200).json(menuItemsWithImages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menu items', error: error.message });
  }
});

// Update menu items
router.post('/update', async (req, res) => {
  const { menuitems } = req.body;

  try {
    for (const item of menuitems) {
      await MenuItem.findOneAndUpdate(
        { name: item.name },
        {
          available: item.available,
          type: item.type,
          description: item.description,
          price: item.price,
        }
      );
    }
    res.status(200).json({ message: 'Menu updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update menu', error: error.message });
  }
});

// Add a new route to handle the addition of a new dish
router.post('/add', async (req, res) => {
  const { name, type, description, price, image_path } = req.body;

  try {
    const newDish = new Dish({
      name,
      type,
      description,
      price,
      image_path,
    });

    await newDish.save();

    const newMenuItem = new MenuItem({
      name,
      type,
      description,
      price,
      available: true,
    });

    await newMenuItem.save();

    res.status(200).json({ message: 'Menu item added successfully to both collections' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add menu item', error: error.message });
  }
});

// Fetch a specific dish by name (to get image path)
router.get('/dishes/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const dish = await Dish.findOne({ name });
    if (dish) {
      res.status(200).json(dish);
    } else {
      res.status(404).json({ message: 'Dish not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dish', error: error.message });
  }
});

module.exports = router;
