const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  let details;

  if (err.name === 'ZodError') {
    status = 400;
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    message = details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message)).join('; ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join('; ');
  } else if (err.code === 11000) {
    status = 409;
    message = 'That value is already in use';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller' : err.message;
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ message, ...(details && { details }) });
};

module.exports = { notFound, errorHandler };
