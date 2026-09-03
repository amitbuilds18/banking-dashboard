// Input Validation Middleware

export const validateTransaction = (req, res, next) => {
  const { name, amount, receiver_email } = req.body;

  // Validate name
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Transaction name is required and must be a string' });
  }

  if (name.length > 100) {
    return res.status(400).json({ error: 'Transaction name must not exceed 100 characters' });
  }

  // Validate amount
  if (amount === undefined || amount === null || amount === '') {
    return res.status(400).json({ error: 'Amount is required' });
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount)) {
    return res.status(400).json({ error: 'Amount must be a valid number' });
  }

  if (parsedAmount === 0) {
    return res.status(400).json({ error: 'Amount cannot be zero' });
  }

  if (Math.abs(parsedAmount) > 999999999) {
    return res.status(400).json({ error: 'Amount exceeds maximum limit' });
  }

  // Validate receiver_email if provided
  if (receiver_email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(receiver_email)) {
      return res.status(400).json({ error: 'Invalid receiver email format' });
    }
  }

  next();
};

export const validateSendMoney = (req, res, next) => {
  const { receiver_email, amount } = req.body;

  // Validate receiver_email
  if (!receiver_email || typeof receiver_email !== 'string') {
    return res.status(400).json({ error: 'Receiver email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(receiver_email)) {
    return res.status(400).json({ error: 'Invalid receiver email format' });
  }

  // Validate amount
  if (amount === undefined || amount === null || amount === '') {
    return res.status(400).json({ error: 'Amount is required' });
  }

  const parsedAmount = Number(amount);
  if (isNaN(parsedAmount)) {
    return res.status(400).json({ error: 'Amount must be a valid number' });
  }

  if (parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero' });
  }

  if (parsedAmount > 999999999) {
    return res.status(400).json({ error: 'Amount exceeds maximum limit' });
  }

  next();
};

export const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  // Validate name
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
  }

  // Validate email
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate password
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (password.length > 128) {
    return res.status(400).json({ error: 'Password is too long' });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  next();
};

export const validateSearch = (req, res, next) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  if (q.length > 255) {
    return res.status(400).json({ error: 'Search query is too long' });
  }

  next();
};
