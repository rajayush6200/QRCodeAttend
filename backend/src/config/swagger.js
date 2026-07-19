const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QRCodeAttend API',
      version: '1.0.0',
      description: 'Dynamic QR-based Proxy-Free Attendance Management System API',
      contact: {
        name: 'QRCodeAttend Support',
        email: 'support@qrcodeattend.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}/api/v1`,
        description: 'Development server',
      },
      {
        url: 'https://api.qrcodeattend.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'faculty', 'student'] },
            institutionId: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Session: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            courseId: { type: 'string' },
            facultyId: { type: 'string' },
            title: { type: 'string' },
            status: {
              type: 'string',
              enum: ['scheduled', 'active', 'completed', 'cancelled'],
            },
            geoLocation: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lng: { type: 'number' },
                radius: { type: 'number' },
              },
            },
            qrRotationInterval: { type: 'number', example: 30 },
          },
        },
        Attendance: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            sessionId: { type: 'string' },
            studentId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['present', 'absent', 'late', 'excused'],
            },
            markedAt: { type: 'string', format: 'date-time' },
            isVerified: { type: 'boolean' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Admin', description: 'Admin management endpoints' },
      { name: 'Faculty', description: 'Faculty endpoints' },
      { name: 'Student', description: 'Student endpoints' },
      { name: 'Notifications', description: 'Notification endpoints' },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info hgroup.main { margin: 0 0 20px 0; }
      `,
      customSiteTitle: 'QRCodeAttend API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    })
  );

  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

module.exports = { setupSwagger, swaggerSpec };
