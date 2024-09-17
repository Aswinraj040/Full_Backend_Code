// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();// Load environment variables
const multer = require('multer'); 

// Initialize the Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/test', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Define a schema for the 'usertypes' collection
const userSchema = new mongoose.Schema({
    screen: Number,
    phno: String
});

// Create a model based on the user schema
const User = mongoose.model('User', userSchema, 'usertypes');

// Define a schema for the 'menuitems' collection
const menuItemSchema = new mongoose.Schema({
    name: String,
    type: String,
    description: String,
    price: Number,
    image_path: String,
    available: Boolean
});
const dishSchema = new mongoose.Schema({
  name: String,
  type: String,
  description: String,
  price: Number,
  image_path: String, // Path to the image file
});

const categorySchema = new mongoose.Schema({
  name: String,
});
const Category = mongoose.model("Category", categorySchema);

const specialSchema = new mongoose.Schema({
  name: String,
  type: String,
  description: String,
  price: Number,
  image_path: String, // Path to the image file
  available: Boolean,
  timestamp: Date
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
// Create a model based on the menu item schema
const MenuItem = mongoose.model('MenuItem', menuItemSchema, 'menuitems');
const Special = mongoose.model('Special', specialSchema, 'todayspecials');
const PopularItem = mongoose.model('PopularItem', popularItemSchema, 'popular_items');
const Dish = mongoose.model('Dish', dishSchema);
const GST = mongoose.model('GST', gstSchema, 'gst');

app.use('/upimages', express.static(path.join(__dirname, 'Allitems')));

app.get('/menuitems', async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ available: true });
    res.json(menuItems);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

app.get("/menuitems/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }
    const menuItems = await MenuItem.find({
      name: { $regex: new RegExp(query, "i") },
      available: true,
    });
    res.json(menuItems);
  } catch (err) {
    res.status(500).json({ error: "Failed to search menu items" });
  }
});

app.get("/menuitems/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    // Find menu items by category
    const menuItems = await MenuItem.find({
      category: category,
      available: true,
    });
    res.json(menuItems);
  } catch (err) {
    console.error("Failed to fetch menu items by category:", err);
    res.status(500).json({ error: "Failed to fetch menu items by category" });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find({});
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


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

app.get('/menu-items-status', async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    const popularItems = await PopularItem.find();
    const todaySpecials = await Special.find();

    const menuItemsWithStatus = menuItems.map(item => ({
      ...item.toObject(),
      isPopular: popularItems.some(popularItem => popularItem.name === item.name),
      isTodaySpecial: todaySpecials.some(specialItem => specialItem.name === item.name)
    }));

    res.json(menuItemsWithStatus);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu items with status' });
  }
});

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
      // If it's already popular, remove it
      await PopularItem.deleteOne({ name });
      res.status(200).json({ message: 'Item removed from Popular Items' });
    } else {
      // If it's not popular, add it
      const menuItem = await MenuItem.findOne({ name });

      if (!menuItem) {
        return res.status(404).json({ error: 'Menu item not found' });
      }

      const newPopularItem = new PopularItem({
        name: menuItem.name,
        type: menuItem.type,
        description: menuItem.description,
        price: menuItem.price,
        image_path: menuItem.image_path,
      });

      await newPopularItem.save();
      res.status(200).json({ message: 'Item added to Popular Items' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle Popular Item status' });
  }
});

// Route to add a new menu item with image upload
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
// Define the route to handle the API request for user types
app.get('/check', async (req, res) => {
    try {
        console.log(`Incoming API request: ${req.method} ${req.originalUrl}`);
        console.log(`Query Params: ${JSON.stringify(req.query)}`);

        const phoneNumber = req.query.phno;
        const user = await User.findOne({ phno: phoneNumber });

        if (user) {
            console.log(`User found: ${JSON.stringify(user)}`);
            res.json(user);
        } else {
            console.log('Phone number not found');
            res.status(404).json({ message: 'Phone number not found' });
        }

        const allUsers = await User.find({});
        console.log('All users in the collection:');
        console.log(JSON.stringify(allUsers, null, 2));
    } catch (error) {
        console.log('Internal server error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

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

app.post('/update_menu_item', async (req, res) => {
  try {
    const { name, type, description, price, available } = req.body;
    const item = await MenuItem.findOne({ name });

    if (!item) {
      return res.status(404).send('Menu item not found');
    }

    item.type = type;
    item.description = description;
    item.price = parseFloat(price);
    item.available = available;

    await item.save();
    res.status(200).send('Menu item updated successfully');
  } catch (error) {
    res.status(500).send('Error updating menu item');
  }
});

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

// Serve images from the specified directory
app.use('/images', express.static('/Users/apple/Desktop/Full_Backend_Code/AllItems'));

// Import and use the orders routes
const ordersRoutes = require('./routes/orders');
app.use('/orders', ordersRoutes);

// Add a route to handle requests to the root URL
app.get('/', (req, res) => {
    res.send('Welcome to the Restaurant Order Management System');
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
        total_price: Number
      }
    ],
    remarks : String
  });
  
  const OrderUp = mongoose.model('OrderUp', orderSchema, 'orders');
  
// Route to update an existing order
app.post('/orders/update-order', async (req, res) => {
    const { member_id, items , remarks} = req.body;
  
    try {
      // Find the order by member_id
      const existingOrder = await OrderUp.findOne({ member_id });
  
      if (existingOrder) {
        // Update the items in the existing order
        existingOrder.items = items;
        existingOrder.remarks = remarks;
        await existingOrder.save();
  
        res.status(200).json({ message: 'Order updated successfully' });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(3000, '0.0.0.0', () => {
  console.log('Port 3000');
});
