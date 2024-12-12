require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('./src/db'); // Database connection
const authRoutes = require('./src/routes/authRoutes');

const app = express();
const cors = require('cors');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:5001', // Replace with the actual URL and port your Vue.js frontend is running on
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowable methods
  credentials: true // Allow cookies and headers to be sent
}));

// MongoDB connection helper
async function connectDB() {
  const client = await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  return client.connection.db.collection('plants'); // Replace 'plants' with your actual collection name
}

// Search endpoint (POST)
app.get('/search', async (req, res) => {
  try {
    const collection = await connectDB();

    // Extract search parameters from request body
    const { common_name, botanical_name, habitat, medicinal_uses, cultivation_techniques } = req.query;

    // Build the search query dynamically based on provided parameters
    const searchQuery = {};
    if (common_name) searchQuery.common_name = { $regex: common_name, $options: 'i' }; // Case-insensitive search
    if (botanical_name) searchQuery.botanical_name = { $regex: botanical_name, $options: 'i' };
    if (habitat) searchQuery.habitat = { $regex: habitat, $options: 'i' };
    if (medicinal_uses) searchQuery.medicinal_uses = { $regex: medicinal_uses, $options: 'i' };
    if (cultivation_techniques) searchQuery.cultivation_techniques = { $regex: cultivation_techniques, $options: 'i' };

    // Find matching plants in the database
    const plants = await collection.find(searchQuery).toArray();

    // Return results as JSON
    res.json(plants);
  } catch (err) {
    console.error('Error in /search endpoint:', err);
    res.status(500).send('Error connecting to the database');
  }
});

app.use('/users', require('./src/routes/userRoutes'));
app.use('/herbs', require('./src//routes/herbRoutes'));
app.use('/cart', require('./src/routes/cartRoutes'));
app.use('/orders', require('./src/routes/orderRoutes'));

// app.post('/create-payment-intent', async (req, res) => {
//   const { amount, currency, paymentMethodId } = req.body;

//   try {
//     // Step 2: Create a payment intent
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount, // Amount in smallest currency unit (e.g., cents for USD)
//       currency,
//       payment_method: paymentMethodId,
//       confirm: true, // Auto-confirm the payment
//     });

//     // Step 3: Send payment status back to client
//     res.status(200).json({ success: true, paymentIntent });
//   } catch (error) {
//     console.error('Error in payment deduction:', error.message);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET, // Ensure SESSION_SECRET is set in .env
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI, // Ensure MONGO_URI is set in .env
  }),
  cookie: { secure: false }, // Set to true if using HTTPS
}));

// Routes
app.use('/api', authRoutes);
app.use('/auth', authRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the homepage!');
});

// About route
app.get('/about', (req, res) => {
  res.send('This is the about page.');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});