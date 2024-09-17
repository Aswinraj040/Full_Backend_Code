// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Load environment variables
const multer = require('multer');

// Initialize the Express app
const app = express(); 

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/test', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define schemas for 'usertypes', 'menuitems', 'dishes', 'orders', 'todayspecials', 'popular_items', and 'gst' collections
const userSchema = new mongoose.Schema({
  screen: Number,
  phno: String,
});

const menuItemSchema = new mongoose.Schema({
  name: String,
  type: String,
  description: String,
  price: Number,
  image_path: String,
  available: Boolean,
});

const dishSchema = new mongoose.Schema({
  name: String,
  type: String,
  description: String,
  price: Number,
  image_path: String, // Path to the image file
});

const orderSchema = new mongoose.Schema({
  unique_order_id: String,
  tableNumber: String,
  member_id: String,
  items: [
    {
      menuItem: String,
      quantity: Number,
      individual_price: Number,
      total_price: Number,
    },
  ],
});

const specialSchema = new mongoose.Schema({
  name: String,
  type: String,
  description: String,
  price: Number,
  image_path: String, // Path to the image file
  available: Boolean,
  timestamp: Date,
});

const popularItemSchema = new mongoose.Schema({
  name: String,
  type: String,
  description: String,
  price: Number,
  image_path: String,
});

const gstSchema = new mongoose.Schema({
  cgst: Number,
  sgst: Number,
  timestamp: { type: Date, default: Date.now },
});

// Create models based on the schemas
const User = mongoose.model('User', userSchema, 'usertypes');
const MenuItem = mongoose.model('MenuItem', menuItemSchema, 'menuitems');
const Dish = mongoose.model('Dish', dishSchema);
const OrderUp = mongoose.model('OrderUp', orderSchema, 'orders');
const Special = mongoose.model('Special', specialSchema, 'todayspecials');
const PopularItem = mongoose.model('PopularItem', popularItemSchema, 'popular_items');
const GST = mongoose.model('GST', gstSchema, 'gst');

// Serve images from the specified directory
app.use('/upimages', express.static(path.join(__dirname, 'Allitems')));
app.use('/images', express.static('C:/Users/skywa/OneDrive/Desktop/Full_Backend_Code/Full_Backend_Code/AllItems'));

// Multer configuration for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'Allitems')); // Save images in the 'Allitems' folder
  },
  filename: function (req, file, cb) {
    const dishName = req.body.name; // Get the dish name from the request body
    const extension = path.extname(file.originalname); // Get the original file extension
    cb(null, `${dishName}${extension}`); // Save the file as 'DishName.Extension'
  },
});

const upload = multer({ storage: storage });

// Routes

// Fetch all menu items with their statuses
app.get('/menu-items-status', async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    const popularItems = await PopularItem.find();
    const todaySpecials = await Special.find();

    const menuItemsWithStatus = menuItems.map((item) => ({
      ...item.toObject(),
      isPopular: popularItems.some((popularItem) => popularItem.name === item.name),
      isTodaySpecial: todaySpecials.some((specialItem) => specialItem.name === item.name),
    }));

    res.json(menuItemsWithStatus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu items with status' });
  }
});

// Fetch available menu items
app.get('/menuitems', async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ available: true });
    res.json(menuItems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Add a new menu item with image upload
app.post('/add', upload.single('image'), async (req, res) => {
  try {
    const { name, type, description, price, available } = req.body;
    const imagePath = req.file ? `${req.file.filename}` : null; // Use the saved image path

    // Create a new menu item
    const newItem = new MenuItem({
      name,
      type,
      description,
      price,
      available,
      image_path: imagePath, // Save the image path
    });

    // Save the new menu item to the menuitems collection
    await newItem.save();

    // Also add the item to the dishes collection
    const newDish = new Dish({
      name,
      type,
      description,
      price,
      image_path: imagePath, // Save the image path
    });

    await newDish.save();

    res.status(200).json({ message: 'Menu item added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

// Fetch user by phone number
app.get('/check', async (req, res) => {
  try {
    const phoneNumber = req.query.phno;
    const user = await User.findOne({ phno: phoneNumber });

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Phone number not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update menu item availability
app.post('/update', async (req, res) => {
  try {
    const { name, available } = req.body;

    // Find the item by name and update its availability
    const updatedItem = await MenuItem.findOneAndUpdate(
      { name },
      { available },
      { new: true } // Return the updated document
    );

    if (updatedItem) {
      res.status(200).json({ message: 'Menu item updated successfully', updatedItem });
    } else {
      res.status(404).json({ error: 'Menu item not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item
app.delete('/delete/:name', async (req, res) => {
  try {
    const name = req.params.name;

    // Delete the item from the menuitems collection
    await MenuItem.deleteOne({ name });

    // Also delete the item from the dishes collection
    await Dish.deleteOne({ name });

    res.status(200).json({ message: 'Menu item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// Toggle "Today's Special" status with timestamp
app.post('/todays-special', async (req, res) => {
  try {
    const { name } = req.body;

    const existingSpecial = await Special.findOne({ name });

    if (existingSpecial) {
      // If it's already a special, remove it
      await Special.deleteOne({ name });
      res.status(200).json({ message: 'Item removed from Today\'s Special' });
    } else {
      // If it's not a special, add it
      const specialItem = await MenuItem.findOne({ name });

      if (!specialItem) {
        return res.status(404).json({ error: 'Menu item not found' });
      }

      const newSpecial = new Special({
        name: specialItem.name,
        type: specialItem.type,
        description: specialItem.description,
        price: specialItem.price,
        image_path: specialItem.image_path,
        available: specialItem.available,
        timestamp: new Date(),
      });

      await newSpecial.save();
      res.status(200).json({ message: 'Item marked as Today\'s Special' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle Today\'s Special status' });
  }
});

// Toggle Popular Item status
app.post('/toggle-popular', async (req, res) => {
  try {
    const { name } = req.body;

    const existingPopularItem = await PopularItem.findOne({ name });

    if (existingPopularItem) {
      // If it's already a popular item, remove it
      await PopularItem.deleteOne({ name });
      res.status(200).json({ message: 'Item removed from popular items' });
    } else {
      // If it's not a popular item, add it
      const popularItem = await MenuItem.findOne({ name });

      if (!popularItem) {
        return res.status(404).json({ error: 'Menu item not found' });
      }

      const newPopularItem = new PopularItem({
        name: popularItem.name,
        type: popularItem.type,
        description: popularItem.description,
        price: popularItem.price,
        image_path: popularItem.image_path,
      });

      await newPopularItem.save();
      res.status(200).json({ message: 'Item marked as popular' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle popular item status' });
  }
});

// Fetch GST rates
app.get('/gst', async (req, res) => {
  try {
    const gstRates = await GST.find().sort({ timestamp: -1 }).limit(1);
    res.json(gstRates[0]); // Return the latest GST record
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch GST rates' });
  }
});

// Add or update GST rates
app.post('/gst', async (req, res) => {
  try {
    const { cgst, sgst } = req.body;

    // Create a new GST record with the current timestamp
    const newGst = new GST({
      cgst,
      sgst,
    });

    await newGst.save();

    res.status(200).json({ message: 'GST rates added/updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add/update GST rates' });
  }
});

// Fetch GST history
app.get('/gst-history', async (req, res) => {
  try {
    const gstHistory = await GST.find().sort({ timestamp: -1 });
    res.json(gstHistory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch GST history' });
  }
});

// Start the server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});