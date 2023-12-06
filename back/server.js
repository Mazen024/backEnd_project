const express = require('express');
const mongoose = require('mongoose');
const User=require("./Models/User");
const Product = require('./Models/Product');
const bcrypt = require('bcryptjs');
const authP = require('./checkAuth/auth');

const app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: false }))


app.post('/Signin', async (req, res) => {
    const { username, password, confirmPassword, email, phoneNumber, country } = req.body;

    if (!email.endsWith('@gmail.com')) {
        return res.status(400).json({ error: 'Email must be a valid Gmail address.' });
    }

    if (password !== confirmPassword) {
        return res.status(400).send("Passwords do not match");
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
        return res.status(400).json({ error: 'Username is already in use.' });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
        return res.status(400).send('Email is already registered');

    }

    const newUser = new User({ username, password, confirmPassword, email, phoneNumber, country });
    
    try {
        await newUser.save();
        const token = newUser.genAuthToken();
        return res.header('x-auth-token', token).send('SignIn successful');
    } catch (error) {
        return res.status(500).send('Error saving user');
    }
});
app.get('/Login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).send('Invalid username or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).send('Invalid username or password');
        }

        const token = user.genAuthToken();
        res.header('x-auth-token', token).send('Login successful').json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
});

//product
app.post('/add', authMid, async (req, res) => {
    const { title, about, img, price } = req.body;

    let product = new Product({ title, about, img, price, user: req.user._id });
    product = await product.save();

    return res.send(product);
});

app.get('/product', async (req, res) => {
    try {
      const products = await Product.find();
      return res.send(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      return res.status(500).send('Internal Server Error');
    }
  });

app.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findOne({ _id: productId });

    if (!product) {
      return res.status(404).send("Couldn't find a product with the given id");
    }

    return res.send(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).send('Internal Server Error');
  }
});


//card 
app.get('/cart', authP, async (req, res) => {
    let products = [];

    for (const product of req.user.cart)
        products.push(await Product.findById(product._id));

    return res.send(products);
});

app.put('/add', authP, async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).send('Product id is required');

    const product = await Product.findById(id);
    if (!product) return res.status(404).send('The product you are looking for is not found');

    if (req.user.cart.includes(product._id)) return res.status(400).send('The product is already in your cart');

    const user = await User.findByIdAndUpdate(req.user._id, {cart: [...req.user.cart, product._id]}, 
        { new: true, useFindAndModify: false });

    return res.send(user);
});

app.delete('/:id', authP, async (req, res) => {
    const { id } = req.params;
    req.user.cart = req.user.cart.filter(p => String(p) !== id);
    return res.send(await req.user.save());
});

app.delete('/', authP, async (req, res) => {
    req.user.cart = [];
    return res.send(await req.user.save());
});

app.get('/total', authP, async (req, res) => {
    let total = 0;

    let products = [];
    for (const product of req.user.cart)
        products.push(await Product.findById(product));

    for (const product of products)
        total += product.price;

    return res.send(String(total));
    
});

mongoose.connect('mongodb://localhost:27017/online-server')
    .then(() => {
        console.log('connected to MongoDB')
        app.listen(9000, () => console.log('app started on port 9000'))
    }).catch((error) => {
        console.log('cant connect to mongodb' + error)
    })