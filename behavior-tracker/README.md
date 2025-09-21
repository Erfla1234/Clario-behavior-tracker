# Behavior & Progress Tracker

🏥 **HIPAA-Compliant Multi-Tenant Behavior Tracking System for Special Needs Agencies**

A secure, audit-ready platform for logging behavioral incidents, tracking progress, and generating reports while maintaining strict HIPAA compliance.

## ⚠️ HIPAA Notice

**This application handles PHI (Protected Health Information).** Before deployment:

- ✅ Ensure Business Associate Agreement (BAA) with all cloud providers
- ✅ Enable TLS 1.2+ for all connections (database, API, frontend)
- ✅ Use secret managers for production credentials (not .env files)
- ✅ Implement proper backup encryption and retention policies
- ✅ Regular security audits and penetration testing

## Features

### Core Functionality
- **Behavior Logging**: Log incidents with ABC (Antecedent-Behavior-Consequence) data
- **Progress Tracking**: View trends and patterns over time
- **Role-Based Access**: Staff can log, supervisors can export/manage
- **Multi-Tenant**: Organization-level data isolation with Postgres RLS

### Security & Compliance
- **De-identified Data**: Client codes + initials only (no full names/DOB)
- **Audit Logging**: Comprehensive, append-only audit trail
- **Row-Level Security**: Database-enforced organization isolation
- **JWT Authentication**: Secure token-based authentication
- **Export Controls**: Supervisor-only data export with watermarks

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Git

### 1. Clone and Install
```bash
git clone <repository-url>
cd behavior-tracker

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Database Setup
```bash
# Create database
createdb behavior_tracker

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://user:password@localhost:5432/behavior_tracker

# Run migrations
cd server
npm run db:migrate

# Seed with demo data
npm run db:seed
```

### 3. Start Development Servers
```bash
# Terminal 1: Start backend API
cd server
npm run dev

# Terminal 2: Start frontend
npm run dev
```

Visit http://localhost:5173

### Demo Credentials
- **Supervisor**: supervisor@demo.com / demo123!
- **Staff**: staff@demo.com / demo123!

## Project Structure

```
behavior-tracker/
├── src/                          # Frontend React app
│   ├── app/                      # App providers and routing
│   ├── pages/                    # Main application pages
│   ├── components/               # Reusable UI components
│   ├── data/                     # Data layer
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── adapters/            # Data adapters (mock, API)
│   │   └── repositories/        # Repository pattern
│   └── lib/                     # Utilities (auth, CSV, PDF)
├── server/                       # Backend Fastify API
│   ├── src/
│   │   ├── routes/              # API endpoints
│   │   ├── middleware/          # Auth middleware
│   │   ├── db/                  # Database connection & schema
│   │   └── services/            # Business logic
│   └── package.json
└── .env.example                 # Environment template
```

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Current user info

### Data Management
- `GET /clients` - List organization clients
- `GET /behaviors` - List organization behaviors
- `POST /logs` - Create behavior log entry
- `GET /logs` - List logs with filtering
- `GET /reports/summary` - Analytics summary
- `GET /reports/export` - CSV/PDF export (supervisor only)

### Audit & Compliance
- `GET /audit` - Audit log access (supervisor only)

## Development Commands

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend
```bash
npm run dev          # Start with hot reload
npm run build        # Compile TypeScript
npm run start        # Run production build
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed with demo data
```

## Data Model

### Organizations & Users
- Multi-tenant with organization-level isolation
- Role-based access (staff, supervisor)
- No PHI in user records

### Clients (De-identified)
- Client codes (e.g., "JD001") instead of names
- Display names with initials only (e.g., "J.D.")
- No DOB, address, or insurance information

### Behavior Logs
- ABC data model (Antecedent-Behavior-Consequence)
- Intensity ratings (1-5 scale)
- Duration tracking
- Incident flagging
- Staff attribution

### Audit Trail
- All data access logged
- Immutable append-only logs
- Actor identification
- Timestamp and metadata tracking

## Security Architecture

### Database Security
- **Row-Level Security (RLS)**: Postgres policies enforce organization boundaries
- **Parameterized Queries**: SQL injection prevention
- **Connection Pooling**: Secure connection management

### API Security
- **JWT Authentication**: Stateless token-based auth
- **CORS Protection**: Configured allowed origins
- **Input Validation**: Request validation and sanitization
- **Rate Limiting**: Protection against abuse

### Frontend Security
- **Token Management**: Secure token storage and refresh
- **Route Protection**: Authenticated route guards
- **Role Enforcement**: UI elements based on user permissions

## Deployment Considerations

### HIPAA Compliance Checklist
- [ ] BAA signed with cloud provider
- [ ] Database encryption at rest enabled
- [ ] TLS 1.2+ enforced for all connections
- [ ] Regular automated backups with encryption
- [ ] Log aggregation and monitoring setup
- [ ] Incident response procedures documented
- [ ] Staff training on PHI handling completed

### Production Environment
- Use managed secret services (AWS Secrets Manager, etc.)
- Enable database SSL mode
- Configure proper logging and monitoring
- Set up automated security scanning
- Implement proper backup and disaster recovery

## License

Private - This application handles PHI and is subject to HIPAA regulations.

## Support

For HIPAA compliance questions or technical support, contact your system administrator.
