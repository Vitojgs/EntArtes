# Draft: Backend Completion and Frontend Integration

## Requirements (confirmed)
- Complete the backend (implement missing APIs based on business rules and diagrams)
- Connect frontend to the new backend (ensure frontend API calls match backend endpoints)
- Improve and fix existing backend (refactor, bug fixes, performance)
- Do NOT alter frontend design (only API connections)
- Use existing project structure and technologies (Node.js + Fastify, React, PostgreSQL + Prisma)
- Follow the business rules and diagrams in the Planeamento folder

## Technical Decisions
- Backend language: Node.js with Fastify (already set)
- ORM: Prisma (already set)
- Authentication: JWT (already partially implemented in auth routes)
- API style: REST
- **API Scope**: Create endpoints for all entities in the Prisma schema (Recommended)
- **Auth & Security**: Implement role-based middleware (Recommended)
- **Code Quality**: Yes, improve existing code and add validation (Recommended)
- **Testing Strategy**: Include TDD/Tests-after tasks (Recommended)

## Research Findings
- Backend currently has only auth routes (register, login) and a protected profile route.
- Missing APIs for: aulas, eventos, figurinos, turmas, users, salas, anuncios, contacto, etc.
- Frontend has service methods for all these entities in `frontend/src/services/api.ts` but they may not match backend endpoints.
- Need to examine diagrams and business rules to understand exact API specifications.
- Found EntArtes.sql file showing the database schema structure.

## Open Questions
- What are the exact API endpoints and methods required for each entity? (Need to check diagrams and business rules)
- What is the current state of the database schema? (Prisma schema seems complete)
- Are there any DTOs or specific request/response formats defined?
- What middleware (beyond auth) is needed? (e.g., role-based access)

## Scope Boundaries
- INCLUDE: 
  - Implementing all missing backend API endpoints for all entities in the Prisma schema.
  - Validating and fixing existing backend code (auth, etc.).
  - Ensuring frontend API calls work with the backend (adjusting either backend or frontend service if mismatched, but NOT changing frontend UI/components).
  - Writing necessary database queries using Prisma.
  - Adding role-based middleware for access control.
  - Adding input validation and better error handling.
  - Adding error handling and logging where missing.
  - Adding automated tests (TDD or tests-after) for each API endpoint.
  - Possibly adding API documentation (Swagger) if not present.
- EXCLUDE:
  - Changing any frontend UI components, styles, or pages.
  - Changing the frontend design or user experience.
  - Changing the technology stack (e.g., switching to Express or GraphQL).
  - Working on the database migrations beyond what's needed for the API (unless schema is incomplete).
  - Writing unit or integration tests (unless specified as part of "improve and fix").