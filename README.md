# FOIA Stream

> 🔍 **Transparency and Audit Application for Public Records Requests**

FOIA Stream bridges the gap between law-enforcement agencies and civilians by making public-records requests simple, automating disclosure, and centralizing information. The platform increases accountability and rebuilds trust through transparency.

## Features

### 🔐 User Management
- Multiple user roles: civilians, journalists, researchers, attorneys, community advocates, and agency officials
- Secure authentication with JWT tokens
- Role-based permissions for different access levels

### 📝 FOIA Request Wizard
- **Guided submissions**: Step-by-step form for identifying correct agencies
- **Request templates**: Pre-built templates for common requests (body-cam footage, use-of-force reports, policies)
- **Tracking dashboard**: Track status, deadlines, and fees
- **Jurisdiction routing**: Automatic routing to state, local, or federal agencies

### 🏛️ Agency Management
- Comprehensive agency database with FOIA contact information
- Response deadline tracking
- Agency compliance statistics

### 📊 Transparency Dashboards
- Response metrics and compliance rates
- Request statistics by agency
- Timeline tracking for deadlines

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime
- **Web Framework**: [Hono](https://hono.dev/) - Lightweight, ultrafast web framework
- **Database**: SQLite with [Drizzle ORM](https://orm.drizzle.team/)
- **Validation**: [Zod](https://zod.dev/) - TypeScript-first schema validation
- **Authentication**: JWT with [jose](https://github.com/panva/jose)
- **Password Hashing**: [Argon2](https://github.com/ranisalt/node-argon2)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0

### Installation

```bash
# Clone the repository
git clone https://github.com/WomB0ComB0/foia-stream.git
cd foia-stream

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Generate database
bun run db:push

# Start development server
bun run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-at-least-32-chars
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create new account |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Get current user |
| PATCH | `/api/v1/auth/me` | Update profile |

### FOIA Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/requests` | Search public requests |
| GET | `/api/v1/requests/my` | Get user's requests |
| GET | `/api/v1/requests/:id` | Get request details |
| POST | `/api/v1/requests` | Create new request |
| POST | `/api/v1/requests/:id/submit` | Submit draft request |
| PATCH | `/api/v1/requests/:id` | Update request |
| POST | `/api/v1/requests/:id/withdraw` | Withdraw request |

### Agencies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agencies` | Search agencies |
| GET | `/api/v1/agencies/:id` | Get agency details |
| GET | `/api/v1/agencies/:id/stats` | Get agency statistics |
| GET | `/api/v1/agencies/states` | Get US states list |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/templates` | Search templates |
| GET | `/api/v1/templates/official` | Get official templates |
| GET | `/api/v1/templates/category/:category` | Get by category |
| POST | `/api/v1/templates` | Create template |

## Project Structure

```
foia-stream/
├── index.ts              # Server entry point
├── src/
│   ├── app.ts            # Hono application setup
│   ├── config/
│   │   └── env.ts        # Environment configuration
│   ├── db/
│   │   ├── index.ts      # Database connection
│   │   └── schema.ts     # Drizzle schema definitions
│   ├── middleware/
│   │   └── auth.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── requests.routes.ts
│   │   ├── agencies.routes.ts
│   │   └── templates.routes.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── foia-request.service.ts
│   │   ├── agency.service.ts
│   │   └── template.service.ts
│   ├── types/
│   │   └── index.ts
│   └── validators/
│       └── schemas.ts
├── drizzle/              # Database migrations
├── data/                 # SQLite database files
└── uploads/              # Uploaded documents
```

## Database Schema

The application uses SQLite with the following main tables:

- **users**: User accounts and authentication
- **agencies**: Law enforcement and government agencies
- **foia_requests**: FOIA request submissions
- **request_templates**: Reusable request templates
- **documents**: Uploaded files and media
- **comments**: User comments on documents
- **appeals**: Appeal submissions for denied requests
- **audit_logs**: Activity logging for transparency

## Scripts

```bash
bun run dev          # Start development server with hot reload
bun run start        # Start production server
bun run db:generate  # Generate database migrations
bun run db:push      # Push schema to database
bun run db:studio    # Open Drizzle Studio (DB GUI)
bun run typecheck    # Run TypeScript type checking
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Built with transparency and public accountability in mind
- Inspired by [Campaign Zero](https://campaignzero.org/) transparency initiatives
- Request templates based on standard FOIA languageTo install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
