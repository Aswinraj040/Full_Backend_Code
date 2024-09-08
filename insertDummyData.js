//insertDummyData.js
const mongoose = require("mongoose");
const Order = require("./models/order"); // Ensure this path is correct

// Connect to the MongoDB database
mongoose.connect("mongodb://localhost:27017/test", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const seedData = async () => {
  try {
    // Define some dummy data
    const orders = [
      {
        unique_order_id: "ORD001",
        tableNumber: "Table 1",
        member_id: "MEM001",  // Add member_id here
        items: [
          {
            menuItem: "Pizza",
            quantity: 2,
            individual_price: 300,
          },
          {
            menuItem: "Pasta",
            quantity: 1,
            individual_price: 200,
          },
        ],
      },
      {
        unique_order_id: "ORD002",
        tableNumber: "Table 2",
        member_id: "MEM002",  // Add member_id here
        items: [
          {
            menuItem: "Burger",
            quantity: 3,
            individual_price: 150,
          },
          {
            menuItem: "Fries",
            quantity: 2,
            individual_price: 100,
          },
        ],
      },
      {
        unique_order_id: "ORD003",
        tableNumber: "Table 3",
        member_id: "MEM003",  // Add member_id here
        items: [
          {
            menuItem: "Steak",
            quantity: 1,
            individual_price: 500,
          },
          {
            menuItem: "Salad",
            quantity: 2,
            individual_price: 150,
          },
        ],
      },
    ];
    

    // Insert the dummy data into the database
    for (const orderData of orders) {  // Corrected the loop variable name
      const order = new Order(orderData);
      await order.save();
    }

    console.log("Dummy data inserted successfully!");
    mongoose.connection.close();
  } catch (error) {
    console.error("Error inserting dummy data:", error);
    mongoose.connection.close();
  }
};

seedData();
