export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'OpenSpace API',
    version: '1.0.0',
    description: 'API documentation for the OpenSpace room booking platform',
    contact: {
      name: 'OpenSpace Support',
      email: 'support@openspace.example.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server',
    },
    {
      url: 'https://openspace-api.onrender.com',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'Authentication operations' },
    { name: 'Users', description: 'User operations' },
    { name: 'Rooms', description: 'Room operations' },
    { name: 'Bookings', description: 'Booking operations' },
    { name: 'Reviews', description: 'Review operations' },
    { name: 'Admin', description: 'Admin operations' },
    { name: 'Earnings', description: 'Earnings operations' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'jwt',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['user', 'host', 'admin'] },
          profilePicture: { type: 'string' },
          isVerified: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Room: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          location: { type: 'string' },
          capacity: { type: 'integer' },
          amenities: { type: 'array', items: { type: 'string' } },
          images: { type: 'array', items: { type: 'string' } },
          host: { type: 'string' },
          isApproved: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          room: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          totalPrice: { type: 'number' },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'canceled', 'completed'],
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Review: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          room: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          error: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
        },
        required: ['email', 'password'],
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' },
          passwordConfirm: { type: 'string', format: 'password' },
        },
        required: ['name', 'email', 'password', 'passwordConfirm'],
      },
    },
  },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Create a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '409': {
            description: 'Email already in use',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        description: 'Authenticate a user and get JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    // Example room route
    '/api/rooms': {
      get: {
        tags: ['Rooms'],
        summary: 'Get all rooms',
        description: 'Retrieve a list of all available rooms',
        responses: {
          '200': {
            description: 'List of rooms',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    rooms: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Room' },
                    },
                    total: { type: 'integer' },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Rooms'],
        summary: 'Create a new room',
        description: 'Create a new room listing (requires host authentication)',
        security: [{ cookieAuth: [] as string[] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  price: { type: 'number' },
                  location: { type: 'string' },
                  capacity: { type: 'integer' },
                  amenities: { type: 'array', items: { type: 'string' } },
                },
                required: ['name', 'description', 'price', 'location'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Room created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    room: { $ref: '#/components/schemas/Room' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Not authenticated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '403': {
            description: 'Not authorized as host',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
  },
};
