const { body, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const rawErrors = errors.array();

    // Simplify errors: { field, message }
    const formattedErrors = rawErrors.map(err => ({
      field: err.path,
      message: err.msg,
    }));

    // Build a map: { email: "Please provide a valid email", password: "..." }
    const fieldErrors = formattedErrors.reduce((acc, err) => {
      // if multiple errors for same field, keep the first
      if (!acc[err.field]) {
        acc[err.field] = err.message;
      }
      return acc;
    }, {});

    // Pick the first error message as the main one
    const firstErrorMessage = formattedErrors[0]?.message || 'Invalid input';

    return res.status(400).json({
      error: 'Validation failed',
      message: firstErrorMessage, // 👈 nice, user-friendly main message
      fieldErrors,                // 👈 per-field messages for the UI
      details: rawErrors,         // 👈 full details if you need them
    });
  }

  next();
};

// Validation rules for user registration
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  handleValidationErrors,
];

// Validation rules for user login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors,
];

module.exports = {
  validateRegistration,
  validateLogin,
  handleValidationErrors,
};
