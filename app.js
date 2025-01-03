const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1)Global MIDDLEWARES
//serving static file
app.use(express.static(path.join(__dirname, 'public')));
//set security http headers

// app.use((req, res, next) => {
//   res.set('Cache-Control', 'no-store'); // منع التخزين المؤقت
//   next();
// });
// Middleware to ignore .map files
// app.use((req, res, next) => {
//   if (req.url.endsWith('.map')) {
//     return res.status(404).send('Source map not found');
//   }
//   next();
// });

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'ws://127.0.0.1:*'],
      scriptSrc: [
        "'self'",
        'https://cdnjs.cloudflare.com',
        'https://js.stripe.com'
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://www.natours.dev'], // أضف المصادر المسموح بها للصور
      frameSrc: ["'self'", 'https://js.stripe.com'] // للسماح لـ Stripe بتحميل iframe عند الدفع
    }
  })
);

//development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limit request from same api
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'too manny requests from this ip! please try again in  1 hour'
});
app.use('/api', limiter);

// body parser, reading date from body into req.body
app.use(express.json({ limit: '10kb' }));

app.use(cookieParser());

//data sanitization against noSQL query injection
app.use(mongoSanitize());

//data sanitization against XSS (cross-site scripting attacks)
app.use(xss());

//prevent parameters pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// testing middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  //  console.log(req.cookies);
  next();
});

// 3) ROUTES

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`can't find ${req.originalUrl} on this server! `, 404));
});

app.use(globalErrorHandler);

module.exports = app;
