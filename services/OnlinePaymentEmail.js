//OnlinePaymentEmail.js
//require('dotenv').config();
const nodemailer = require('nodemailer');


function sendPaymentEmail(order) {
  // Set up transporter with your email service credentials
  let transporter = nodemailer.createTransport({
    service: 'gmail', // You can use any email service
    auth: {
      user: "rmtejaswini657@gmail.com", // Your email address
      pass: "mjxl ndpd tgnn qtbc"   // Your email password (consider using environment variables for security)
    }
  });

  // Set up email options
  let mailOptions = {
    from: process.env.EMAIL_USER, // Sender address
    to: 'rajeshharsha009@gmail.com', // List of recipients (you can use order.email if the email is stored in the order)
    subject: 'Your Payment Link', // Subject line
    text: `Dear Customer,

Thank you for your order. Please click on the following link to complete your payment:

[Insert Payment Link Here]

Order Details:
- Order ID: ${order.unique_order_id}
- Total Amount: $${order.final_price.toFixed(2)}

Thank you for your business!

Best regards,
Your Restaurant Team`, // Plain text body
    // html: '<b>Your Payment Link</b>' // HTML body, optional
  };

  transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
      console.log('Error sending email: ', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

module.exports = sendPaymentEmail;