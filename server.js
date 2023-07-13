const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(bodyParser.json());

mongoose
  .connect('mongodb://localhost/judge0-api-clone', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB', error);
  });

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
});


const User = mongoose.model('User', userSchema);


app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = new User({ username, password });
    await newUser.save();

    res.json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Failed to register user', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, 'your_secret_key');

    res.json({ token });
  } catch (error) {
    console.error('Failed to authenticate user', error);
    res.status(500).json({ error: 'Failed to authenticate user' });
  }
});


function authenticateUser(req, res, next) {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, 'your_secret_key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('Invalid token', error);
    res.status(401).json({ error: 'Invalid token' });
  }
}


app.post('/api/submissions', authenticateUser, async (req, res) => {
  try {
    const code = req.body.code;
    const language = req.body.language;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    if (!language) {
      return res.status(400).json({ error: 'Language is required' });
    }

    io.emit('submissionStarted', { userId: req.userId });

    setTimeout(() => {
      const result = `Output for code: ${code}`;
      io.emit('submissionCompleted', { userId: req.userId, result });
    }, 3000);

    res.json({ message: 'Code submission received' });
  } catch (error) {
    console.error('Failed to submit code', error);
    res.status(500).json({ error: 'Failed to submit code' });
  }
});


io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});


const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
