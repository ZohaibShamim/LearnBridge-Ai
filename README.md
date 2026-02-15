# Learn Bridge AI - Career Development Platform

A comprehensive full-stack platform that leverages AI to generate personalized career roadmaps from user CVs. The platform enables users to upload their resumes, which are processed by an AI service to generate tailored career development plans with skills, resources, and learning paths.

## 🎯 Project Overview

**Learn Bridge AI** is an intelligent career guidance system that:
- Helps users understand their current skills and experience through CV analysis
- Generates personalized career roadmaps using advanced AI models (Groq, HuggingFace, OpenAI)
- Provides structured learning paths with skill recommendations and learning resources
- Manages user profiles, authentication, and career progression tracking
- Supports multi-role user system (students and teachers)

The platform is built with modern technologies across three main services:
- **Frontend**: Next.js with React 19 and TypeScript
- **Backend**: Express.js with MongoDB and Redis
- **AI Service**: FastAPI with multiple AI provider support

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Learn Bridge AI System                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   Frontend (Next.js)  │
│  - React 19 + TS     │
│  - Tailwind CSS      │
│  - TanStack Query    │
│  - Zustand State     │
└──────────┬───────────┘
           │
           │ HTTP/REST
           │ (Port 3000)
           │
┌──────────▼───────────────────────────────────────────┐
│         Backend (Express.js)                         │
│  - Authentication & Authorization                   │
│  - User & Profile Management                        │
│  - CV Processing & Upload (Cloudinary)             │
│  - Roadmap Storage & Retrieval                     │
│  - Job Queue Management (BullMQ)                   │
│  - Redis Integration                                │
│  - MongoDB Database                                 │
└────────┬──────────────────────┬──────────────────────┘
         │ (Port 8000)          │
         │                      └─────────┐
         │                                │
         │ REST API Calls to AI Service   │
         │                                │
┌────────▼─────────────────────┐  ┌──────▼──────────────┐
│  AI Service (FastAPI)        │  │  External Services  │
│  - CV Text Extraction        │  │  - Cloudinary       │
│  - AI Roadmap Generation     │  │  - Resend Email     │
│  - Resource Enrichment        │  │  - Google Fonts    │
│  - Groq/HuggingFace/OpenAI  │  └─────────────────────┘
│  (Port 8001)                │
└──────────────────────────────┘

Database & Cache:
┌─────────────────┐  ┌──────────────────┐
│   MongoDB       │  │   Redis (Cache)  │
│  - Users        │  │  - Sessions      │
│  - Profiles     │  │  - Job Queues    │
│  - Roadmaps     │  │  - Token Store   │
│  - Jobs         │  └──────────────────┘
└─────────────────┘
```

---

## 📁 Folder Structure & Purpose

### Root Level
```
learn-bridge-ai/
├── ai/                 # AI Service (FastAPI)
├── backend/            # Express.js Backend
├── frontend/           # Next.js Frontend
└── README.md          # This file
```

---

## 🚀 AI Service Module (`/ai`)

The FastAPI service responsible for AI-powered career roadmap generation and resource enrichment.

### Key Directories

```
ai/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── api/
│   │   └── v1/
│   │       └── roadmap.py      # Career roadmap generation endpoints
│   ├── core/
│   │   └── config.py           # Configuration & AI provider settings
│   ├── schema/
│   │   └── cv.py               # Pydantic models for CV data validation
│   ├── services/
│   │   ├── ai_service.py       # AI provider integration (Groq, HuggingFace, OpenAI)
│   │   └── search_service.py   # Resource enrichment & search functionality
│   └── utils/
│       └── prompt.py           # Prompt engineering & CV analysis prompts
├── run.py                      # Server startup script
├── test.py                     # Test suite
├── requirements.txt            # Python dependencies
└── README.md                   # AI service documentation
```

### AI Service Architecture

#### **1. `main.py` - FastAPI Application Setup**
- Initializes FastAPI application with CORS support
- Routes requests to the roadmap router
- Serves API documentation at `/docs` and `/redoc`

#### **2. `api/v1/roadmap.py` - Core API Endpoints**
- **POST `/ai/roadmap`** - Generate career roadmap from CV
  - Accepts CV text and target role
  - Returns JSON-formatted roadmap with steps, skills, timeline
  - Extracts and returns top skills as tags
  - Enriches roadmap with learning resources
  
**Response Structure:**
```json
{
  "roadmap": {
    "career_goal": "string",
    "current_level": "string",
    "timeline_months": number,
    "steps": [
      {
        "phase": string,
        "duration_months": number,
        "title": string,
        "description": string,
        "skills": [string],
        "milestones": [string],
        "resources": [
          {
            "title": string,
            "url": string,
            "type": string,
            "platform": string
          }
        ]
      }
    ]
  },
  "tags": [string]  // Top skills extracted from roadmap
}
```

#### **3. `services/ai_service.py` - AI Provider Integration**
Provides multi-provider AI support with automatic fallback:

**Providers Supported:**
1. **Groq** (Recommended - Free & Fast)
   - Model: `llama-3.3-70b-versatile`
   - Fast inference with good quality
   - Free tier available
   
2. **HuggingFace** (Free Option)
   - Model: `HuggingFaceH4/zephyr-7b-beta`
   - Fully free inference API
   - Community-driven
   
3. **OpenAI** (Premium)
   - Model: `gpt-3.5-turbo`
   - Highest quality results
   - Requires API key and payment

**Key Functions:**
- `generate_roadmap_from_cv(cv_text, role)` - Main entry point
- `_call_groq(prompt)` - Groq API integration
- `_call_huggingface(prompt)` - HuggingFace API integration
- `_call_openai(prompt)` - OpenAI API integration

#### **4. `services/search_service.py` - Resource Enrichment**
- Searches for learning resources (courses, tutorials, articles) using DuckDuckGo
- Enriches each roadmap step with relevant resources
- Provides platform-specific links (YouTube, Udemy, Coursera, etc.)

#### **5. `core/config.py` - Configuration Management**
```python
# Environment-based configuration
AI_PROVIDER = "groq"  # Switch between groq, huggingface, openai
HUGGINGFACE_API_KEY = "..."
GROQ_API_KEY = "..."
OPENAI_API_KEY = "..."
```

### AI Service Features
- ✅ Multiple AI provider support with configuration
- ✅ CV text analysis and parsing
- ✅ Personalized roadmap generation based on CV and target role
- ✅ Skill extraction and tagging (top 7 skills)
- ✅ Learning resource discovery and enrichment
- ✅ JSON-formatted structured output
- ✅ Error handling and provider fallback
- ✅ Prompt engineering for consistent output format

### API Request/Response Flow
```
Request: CV Text + Target Role
    ↓
AI Service (FastAPI)
    ↓
1. Validate input (CVRequest schema)
    ↓
2. Generate prompt from CV & role
    ↓
3. Call configured AI provider (Groq/HF/OpenAI)
    ↓
4. Parse AI response into structured format
    ↓
5. Extract top skills as tags
    ↓
6. Search for learning resources (DuckDuckGo)
    ↓
7. Enrich roadmap with resources
    ↓
Response: Complete roadmap with resources & tags JSON
```

---

## ⚙️ Backend Module (`/backend`)

Express.js REST API server handling authentication, user management, CV processing, and roadmap storage.

### Key Directories

```
backend/
├── app.js                      # Express application setup
├── index.js                    # Server entry point
├── package.json               # Dependencies & scripts
├── controllers/
│   ├── user/
│   │   └── user.controller.js # User auth & CV upload handlers
│   └── roadmaps/
│       └── roadmaps.controller.js # Roadmap CRUD operations
├── models/
│   ├── user.model.js          # User schema (auth, tokens)
│   ├── profile.model.js       # User profile schema (personal info)
│   ├── roadmap.schema.js      # Career roadmap schema
│   └── jobs.schema.js         # Job queue tracking schema
├── routes/
│   ├── user.routes.js         # User endpoints
│   └── roadmap.routes.js      # Roadmap endpoints
├── middlewares/
│   ├── auth.middleware.js     # JWT authentication
│   └── multer.middlware.js    # File upload handling
├── services/
│   └── (Business logic separated by domain)
├── queues/
│   └── cv.queue.js            # BullMQ job queue for CV processing
├── workers/
│   └── cv.worker.js           # Background worker for CV processing
├── utils/
│   ├── asyncHandler.js        # Async error handling wrapper
│   ├── apiResponse.js         # Standardized API response format
│   ├── appiError.js           # Custom error handling
│   ├── connectDB.js           # MongoDB connection
│   ├── cloudinary.js          # File upload to Cloudinary
│   ├── emails.js              # Email sending via Resend
│   ├── nodemailer.js          # Email via Nodemailer
│   ├── ocr.js                 # Tesseract.js for text extraction
│   └── password.js            # Password hashing & validation
├── public/
│   └── uploads/               # Temporary upload storage
└── test/
    └── register/              # Jest test suite
```

### Backend Architecture

#### **1. `app.js` - Express Configuration**
- CORS setup for frontend communication (Port 3000)
- Cookie parsing for JWT tokens
- JSON/URL-encoded body parsing (16KB limit)
- Route mounting for users & roadmaps

#### **2. Authentication Flow (`user.controller.js`)**

**Two-Step Authentication Process:**

**Step 1: Register/Login**
- `POST /api/v1/users/register`
  - Email validation
  - Password hashing with bcrypt
  - Generate OTP (6 digits)
  - Create User & Profile records (Mongoose transaction)
  - Send OTP via email (Resend or Nodemailer)

- `POST /api/v1/users/login`
  - Email verification
  - Generate OTP
  - Send OTP via email

**Step 2: OTP Verification**
- `POST /api/v1/users/verify-otp`
  - Validate OTP against expiry time (10 minutes)
  - Generate JWT access token & refresh token
  - Return tokens in HTTP-only cookies
  - Update user status to "verified"

**Token Details:**
- **Access Token**: Short-lived (15 minutes), in Authorization header
- **Refresh Token**: Long-lived (7 days), in HTTP-only cookie

#### **3. CV Upload & Processing (`uploadCv`)**

- `POST /api/v1/users/upload-cv` (Protected route)
- **Flow:**
  1. Accept CV file (PDF, DOCX, etc.)
  2. Upload to Cloudinary for storage
  3. Extract text using Tesseract.js (OCR)
  4. Add job to BullMQ queue (cv.queue)
  5. Trigger background worker (cv.worker)
  6. Worker calls AI service to generate roadmap
  7. Save roadmap to MongoDB
  8. Return job status

**Job Queue Benefits:**
- Asynchronous processing
- Prevents request timeout for long-running operations
- Track job progress
- Retry failed jobs automatically

#### **4. Roadmap Management**

- `POST /api/v1/roadmaps/save` (Protected)
  - Save generated roadmap to MongoDB

- `GET /api/v1/roadmaps` (Protected)
  - Get all roadmaps for authenticated user

- `GET /api/v1/roadmaps/:roadmapId` (Protected)
  - Get specific roadmap details

- `DELETE /api/v1/roadmaps/:roadmapId` (Protected)
  - Delete a roadmap

- `GET /api/v1/users/job/:jobId` (Protected)
  - Check CV processing job status

#### **5. Database Models**

**User Schema** (`user.model.js`):
```javascript
{
  email: String (unique),
  password: String (hashed),
  role: String (enum: "student", "teacher"),
  otp: String,
  otp_expiry: Date,
  refreshToken: String,
  forgotPasswordToken: String,
  forgotPasswordExpiry: Date,
  timestamps: true
}
```

**Profile Schema** (`profile.model.js`):
```javascript
{
  userId: ObjectId (ref: User),
  firstName: String,
  lastName: String,
  degree: String,
  institute: String,
  cvUrl: String (Cloudinary),
  profile_picture: String (Cloudinary),
  bio: String,
  skills: [String],
  experience: String,
  timestamps: true
}
```

**Roadmap Schema** (`roadmap.schema.js`):
```javascript
{
  userId: ObjectId (ref: User),
  roadmapData: Object (Complete roadmap JSON from AI),
  tags: [String] (Top skills),
  status: String (enum: "active", "completed", "archived"),
  createdAt: Date,
  updatedAt: Date
}
```

**Job Schema** (`jobs.schema.js`):
```javascript
{
  jobId: String (BullMQ job ID),
  userId: ObjectId (ref: User),
  fileName: String,
  status: String (enum: "pending", "processing", "completed", "failed"),
  result: Object,
  error: String,
  timestamps: true
}
```

#### **6. Middleware**

**Auth Middleware** (`auth.middleware.js`):
- Verifies JWT tokens
- Extracts user ID from token
- Attaches user to request object
- Protects routes requiring authentication

**Multer Middleware** (`multer.middlware.js`):
- Handles file uploads (CV files)
- Validates file types
- Stores in `public/uploads` temporarily

#### **7. Utilities**

- **asyncHandler**: Wraps async route handlers for error catching
- **apiResponse**: Standardized success response format
- **apiError**: Custom error with status codes
- **connectDB**: MongoDB connection with retry logic
- **cloudinary**: File upload service integration
- **emails**: Email sending via Resend (primary) and Nodemailer (fallback)
- **ocr**: Text extraction from PDF/images using Tesseract.js
- **password**: Bcrypt for password hashing/validation

### Backend Key Features
- ✅ JWT-based authentication with OTP verification
- ✅ MongoDB with Mongoose ODM
- ✅ Transaction support for data consistency
- ✅ BullMQ job queue for async CV processing
- ✅ Redis integration for caching & sessions
- ✅ File upload to Cloudinary
- ✅ OCR for text extraction from PDFs
- ✅ Email notifications (Resend + Nodemailer)
- ✅ Error handling and validation
- ✅ Role-based access control

---

## 🎨 Frontend Module (`/frontend`)

Modern React-based frontend built with Next.js 16, TypeScript, and Tailwind CSS.

### Key Directories

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Home/landing page
│   ├── globals.css             # Global styles
│   ├── (auth)/                 # Authentication routes (without sidebar)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (with-sidebar)/         # Protected routes (with sidebar)
│   │   ├── layout.tsx
│   │   ├── account-settings/
│   │   ├── change-password/
│   │   ├── dashboard/
│   │   ├── quizzes/
│   │   ├── roadmap/
│   │   ├── roadmaps/
│   │   ├── settings/
│   │   └── upload/             # CV upload page
│   └── (without-sidebar)/      # Public routes
│       └── layout.tsx
├── components/
│   ├── landing/
│   │   └── landing.tsx         # Landing page component
│   ├── layout/
│   │   └── MainLayout.tsx      # Main layout wrapper
│   ├── sidebar/
│   │   └── Sidebar.tsx         # Navigation sidebar
│   └── providers/
│       └── query-provider/     # TanStack Query setup
├── config/
│   ├── instance/
│   │   └── api.ts              # Axios instance configuration
│   ├── services/
│   │   ├── auth.service.ts     # Auth API calls
│   │   ├── cv.service.ts       # CV upload API calls
│   │   ├── quiz.service.ts     # Quiz API calls
│   │   └── roadmap.service.ts  # Roadmap API calls
│   └── token/
│       └── token.ts            # JWT token management
├── hooks/
│   └── auth-hooks/
│       ├── useAuthProvider.tsx # Auth context provider hook
│       ├── useProtectedWrapper.tsx # Protected route wrapper
│       └── usePublicWrapper.tsx    # Public route wrapper
├── store/
│   └── auth.ts                 # Zustand auth store
├── public/
│   └── images/                 # Public assets
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── next.config.ts             # Next.js config
```

### Frontend Architecture

#### **1. Application Layout Structure**

**Root Layout** (`app/layout.tsx`):
- Sets up providers (TanStack Query, Auth Context)
- Configures global styles with Tailwind CSS
- Implements Suspense boundary with loading state
- Manages font imports (Geist Sans/Mono)

**Route Groups:**

1. **`(auth)` - Authentication Routes**
   - `/login` - User login page
   - `/signup` - User registration page
   - No sidebar layout
   - Public access

2. **`(with-sidebar)` - Protected Routes**
   - Dashboard, settings, roadmaps, upload, etc.
   - Includes sidebar navigation
   - Requires authentication
   - Session-protected

3. **`(without-sidebar)` - Other Public Routes**
   - Special pages without sidebar
   - Public or mixed access

#### **2. Authentication System**

**Zustand Store** (`store/auth.ts`):
```typescript
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  logout: () => void
  setAuthenticated: (status: boolean) => void
}
```

**Auth Context** (`hooks/auth-hooks/useAuthProvider.tsx`):
- Wraps application with auth context
- Manages user session state
- Provides auth state to all components
- Handles token persistence

**Route Protection:**
- `useProtectedWrapper` - Redirects unauthenticated users to login
- `usePublicWrapper` - Redirects authenticated users away from auth pages

#### **3. Service Layer** (`config/services/`)

**API Services Architecture:**
Services handle all backend communication with typed responses.

**auth.service.ts** - Authentication:
```typescript
- register(email, password, firstName, lastName, degree, institute)
- loginStep1(email) // Returns OTP requirement
- verifyOTPAndLogin(email, otp) // Returns JWT tokens
- resendOtp(email)
- refreshToken()
- logout()
```

**cv.service.ts** - CV Upload & Processing:
```typescript
- uploadCV(file: File, targetRole: string)
- getJobStatus(jobId: string) // Track CV processing
- checkProcessing(jobId): Job status (pending/processing/completed/failed)
```

**roadmap.service.ts** - Roadmap Management:
```typescript
- saveRoadmap(roadmapData)
- getRoadmaps() // Get all user roadmaps
- getRoadmapById(id) // Get specific roadmap
- deleteRoadmap(id)
```

**quiz.service.ts** - Quiz/Learning (Future):
```typescript
- getQuizzes()
- submitQuiz(answers)
- getResults()
```

#### **4. API Configuration** (`config/instance/api.ts`)

**Axios Instance Setup:**
- Base URL pointing to backend (http://localhost:8000)
- Automatic JWT token injection in headers
- Request/response interceptors
- Error handling
- Token refresh on 401

```typescript
// Axios instance with default config
- headers: Authorization: Bearer {token}
- baseURL: process.env.NEXT_PUBLIC_API_URL
- withCredentials: true (for cookies)
```

#### **5. Token Management** (`config/token/token.ts`)

**Token Storage & Retrieval:**
- Access token: localStorage (frontend state)
- Refresh token: HTTP-only cookie (secure)
- Automatic token refresh before expiry
- Token cleanup on logout

#### **6. State Management**

**Zustand Store** (`store/auth.ts`):
- Global authentication state
- User data persistence
- Simple API (no boilerplate)
- Lightweight alternative to Redux

**TanStack Query** (`config/providers/query-provider/`):
- Server state management
- Automatic caching
- Background data synchronization
- Optimistic updates
- Built-in error handling

#### **7. Page Components**

**Login/Signup** (`(auth)/`):
- Email input and password validation
- OTP submission form
- Error message display
- Link to alternative auth page
- Form validation

**Dashboard** (`(with-sidebar)/dashboard/`):
- User's overview
- Recent roadmaps
- Quick statistics
- Navigation to other features

**Upload CV** (`(with-sidebar)/upload/`):
- File input for CV
- Target role selection (optional)
- Upload progress indicator
- Job status tracking
- Generated roadmap display

**Roadmaps** (`(with-sidebar)/roadmaps/`):
- List all user's roadmaps
- View roadmap details
- Delete roadmaps
- Export/share options

**Account Settings** (`(with-sidebar)/account-settings/`):
- Edit profile information
- Update skills
- Manage preferences

**Change Password** (`(with-sidebar)/change-password/`):
- Current password verification
- New password input
- Password strength indicator

#### **8. Components**

**Sidebar** (`components/sidebar/Sidebar.tsx`):
- Navigation menu
- User profile link
- Links to all protected routes
- Logout button
- Active route highlighting

**Landing Page** (`components/landing/landing.tsx`):
- Hero section
- Feature highlights
- CTA (Call-to-Action)
- Social proof

**Main Layout** (`components/layout/MainLayout.tsx`):
- Template for pages with sidebar
- Responsive layout
- Mobile menu support

#### **9. Styling**

**Tailwind CSS**:
- Utility-first CSS framework
- PostCSS for processing
- Custom configurations in `tailwind.config.ts`
- Responsive design support
- Dark mode support (optional)

**Global Styles** (`app/globals.css`):
- Reset CSS
- Custom utility classes
- Animation definitions
- Color variables

### Frontend Key Features
- ✅ Server-side rendering with Next.js 16
- ✅ TypeScript for type safety
- ✅ React 19 with latest hooks
- ✅ Tailwind CSS for styling
- ✅ TanStack Query for server state management
- ✅ Zustand for client state
- ✅ Protected and public routes
- ✅ JWT-based authentication
- ✅ Responsive design
- ✅ Error boundaries
- ✅ Loading states & skeleton screens
- ✅ Form validation

---

## 🔌 Integration Flow: Frontend → Backend → AI Service

### User CV Upload & Roadmap Generation Workflow

```
1. USER UPLOADS CV (Frontend)
   └─ Upload CV file + target role
   └─ Frontend: upload.page.tsx
      └─ cv.service.ts → POST /api/v1/users/upload-cv
      
2. BACKEND PROCESSES CV
   └─ Backend: user.controller.js → uploadCv()
   │  ├─ Upload to Cloudinary
   │  ├─ Extract text (Tesseract.js OCR)
   │  ├─ Create Job record
   │  └─ Add to BullMQ queue
   │
   └─ Background Worker: cv.worker.js
      └─ Calls AI Service
      
3. AI SERVICE GENERATES ROADMAP
   └─ AI Service: api/v1/roadmap.py
      ├─ Validate CV text (CVRequest schema)
      ├─ Generate prompt with role context
      ├─ Call configured AI provider
      ├─ Parse response to JSON structure
      ├─ Extract top 7 skills
      ├─ Search for learning resources
      └─ Return complete roadmap
      
4. BACKEND SAVES ROADMAP
   └─ Worker receives roadmap
   └─ Save to MongoDB (Roadmap collection)
   └─ Update Job status to "completed"
   
5. FRONTEND DISPLAYS ROADMAP
   └─ Poll job status: GET /api/v1/users/job/:jobId
   └─ When complete, fetch roadmap
   └─ Display in roadmap viewer
   └─ Allow save/export options
```

### Data Flow Diagram

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │ 1. Upload CV + Role
       │    POST /api/v1/users/upload-cv
       │
       ▼
┌─────────────────┐
│   Express.js    │
│    Backend      │
│   ▼─────────┐   │
│   │         │   │
│   │ Job     │ 2.│ Add to queue
│   │ Queue   │   │ Extract text
│   │ (Redis) │   │ Upload file
│   └──┬──────┘   │
└──────┼──────────┘
       │ Process
       │ 3. Call AI Service
       ▼
┌─────────────────────┐
│   FastAPI Service   │
│       (AI)          │
│  ┌────────────────┐ │
│  │  AI Prompt     │ │
│  │  + CV Text     │ │ 4. Call AI Provider
│  │  + Target Role │ │    (Groq/HF/OpenAI)
│  └────────┬───────┘ │
│           │         │
│  ┌────────▼──────┐  │
│  │  Parse Result │  │ 5. Extract Skills
│  │  & Extract    │  │    Search Resources
│  │  Skills       │  │    Structure JSON
│  └────────┬──────┘  │
└───────────┼──────────┘
            │ Return
            │ Roadmap JSON
            │
       ┌────▼──────────┐
       │ Job Complete  │
       │ Save Roadmap  │
       │ to MongoDB    │
       └───────────────┘
            │ Ready
            │
       ┌────▼──────────┐
       │   Frontend     │
       │   Displays     │
       │   Roadmap      │
       └────────────────┘
```

---

## 📦 Technology Stack

### Frontend Stack
| Technology | Purpose | Version |
|-----------|---------|---------|
| **Next.js** | Full-stack React framework | 16.1.2 |
| **React** | UI library | 19.2.3 |
| **TypeScript** | Type safety | 5 |
| **Tailwind CSS** | Styling | 4 |
| **TanStack Query** | Server state management | 5.90.19 |
| **Zustand** | Client state management | 5.0.10 |
| **Axios** | HTTP client | 1.13.2 |
| **Lucide React** | Icon library | 0.564.0 |
| **ESLint** | Code linting | 9 |

### Backend Stack
| Technology | Purpose | Version |
|-----------|---------|---------|
| **Express.js** | Web framework | 5.2.1 |
| **Node.js** | JavaScript runtime | 18+ |
| **MongoDB** | NoSQL database | - |
| **Mongoose** | MongoDB ODM | 9.1.3 |
| **Redis** | In-memory cache & sessions | - |
| **BullMQ** | Job queue | 5.66.5 |
| **JWT** | Authentication tokens | 9.0.3 |
| **Bcrypt** | Password hashing | 6.0.0 |
| **Multer** | File upload | 2.0.2 |
| **Cloudinary** | File storage service | 2.9.0 |
| **Tesseract.js** | OCR (text extraction) | 7.0.0 |
| **Nodemailer** | Email sending | 7.0.12 |
| **Jest** | Testing framework | 29.7.0 |
| **Supertest** | HTTP assertions | 7.2.2 |

### AI Service Stack
| Technology | Purpose | Version |
|-----------|---------|---------|
| **FastAPI** | Web framework | 0.128.0 |
| **Python** | Programming language | 3.12 |
| **Pydantic** | Data validation | 2.12.5 |
| **Requests** | HTTP client | 2.31.0 |
| **python-dotenv** | Environment config | 1.2.1 |
| **Uvicorn** | ASGI server | 0.40.0 |
| **DuckDuckGo Search** | Resource search | 6.3.5 |
| **Groq API** | AI provider | Free tier |
| **HuggingFace** | AI provider | Free tier |
| **OpenAI API** | AI provider | Optional |

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.12+
- MongoDB (local or Atlas)
- Redis (local or cloud)
- API Keys:
  - Cloudinary (for file uploads)
  - Groq or HuggingFace (for AI)
  - Resend or Nodemailer (for emails)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/learn-bridge-ai.git
cd learn-bridge-ai
```

### 2. Setup AI Service

```bash
cd ai

# Create virtual environment
python3 -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys:
# - GROQ_API_KEY or HUGGINGFACE_API_KEY
# - AI_PROVIDER (groq, huggingface, or openai)

# Run AI service
python run.py
# Available at http://localhost:8001
```

### 3. Setup Backend

```bash
cd ../backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with:
# - PORT=8000
# - MONGODB_URI=your_mongodb_connection
# - REDIS_URL=your_redis_connection
# - DATABASE_NAME=learn_bridge_ai
# - FRONTEND_URL=http://localhost:3000
# - CLOUDINARY_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
# - RESEND_API_KEY or EMAIL/PASSWORD for Nodemailer
# - JWT secrets and expiry times

# Run backend
npm run dev
# Available at http://localhost:8000
```

### 4. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8001
EOF

# Run frontend
npm run dev
# Available at http://localhost:3000
```

### Verify All Services Running
```bash
# Terminal 1: AI Service (Port 8001)
cd ai && python run.py

# Terminal 2: Backend (Port 8000)
cd backend && npm run dev

# Terminal 3: Frontend (Port 3000)
cd frontend && npm run dev

# Terminal 4: Optional - Redis (Port 6379)
redis-server

# Terminal 5: Optional - MongoDB
mongod
```

---

## 📡 API Endpoints Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| POST | `/api/v1/users/register` | Register new user | No |
| POST | `/api/v1/users/login` | Login step 1 (get OTP) | No |
| POST | `/api/v1/users/verify-otp` | Verify OTP & get tokens | No |
| POST | `/api/v1/users/resend-otp` | Resend OTP | No |
| POST | `/api/v1/users/refresh-token` | Refresh access token | No |

### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| POST | `/api/v1/users/upload-cv` | Upload CV file | Yes |
| GET | `/api/v1/users/job/:jobId` | Get CV processing job status | Yes |

### Roadmap Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| POST | `/api/v1/roadmaps/save` | Save generated roadmap | Yes |
| GET | `/api/v1/roadmaps` | Get all user roadmaps | Yes |
| GET | `/api/v1/roadmaps/:roadmapId` | Get specific roadmap | Yes |
| DELETE | `/api/v1/roadmaps/:roadmapId` | Delete roadmap | Yes |

### AI Service Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| POST | `/ai/roadmap` | Generate roadmap from CV | No (internal) |
| GET | `/docs` | API documentation (Swagger) | No |
| GET | `/redoc` | API documentation (ReDoc) | No |

---

## 🔐 Security Features

- ✅ **JWT Authentication**: Secure token-based auth
- ✅ **OTP Verification**: Two-factor authentication
- ✅ **Password Hashing**: Bcrypt with salt rounds
- ✅ **HTTP-Only Cookies**: CSRF protection
- ✅ **CORS**: Restricted to frontend domain
- ✅ **Input Validation**: Pydantic & Express validation
- ✅ **Rate Limiting**: Prevent brute force attacks
- ✅ **Secure File Upload**: Cloudinary integration
- ✅ **MongoDB Transactions**: ACID compliance
- ✅ **Environment Variables**: Secrets management

---

## 📊 Database Schema Overview

### Collections in MongoDB

1. **users** - User account information
2. **profiles** - Extended user profile data
3. **roadmaps** - Generated career roadmaps
4. **jobs** - CV processing job tracking
5. **sessions** - Flask session storage (optional)

### Relationships

```
User (1) ──── (1) Profile
         ├──── (Many) Roadmaps
         └──── (Many) Jobs
```

---

## 🔄 Job Queue System (BullMQ)

CV processing uses a robust job queue system:

```
CV Upload
    │
    └─→ Create Job in Queue
       │
       └─→ Job Worker Picks Up
          │
          ├─→ Extract Text from CV
          ├─→ Call AI Service
          ├─→ Generate Roadmap
          └─→ Save to Database
             │
             └─→ Mark Job as Complete
```

**Job Statuses:**
- `pending`: Waiting to be processed
- `processing`: Currently being processed
- `completed`: Successfully completed with roadmap
- `failed`: Failed with error message

---

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing (To be implemented)
```bash
cd frontend
npm test
```

### AI Service Testing
```bash
cd ai
python test.py
```

---

## 📝 Environment Variables Reference

### AI Service (`.env`)
```bash
AI_PROVIDER=groq  # Options: groq, huggingface, openai
GROQ_API_KEY=xxx
HUGGINGFACE_API_KEY=xxx
OPENAI_API_KEY=xxx
```

### Backend (`.env`)
```bash
PORT=8000
DATABASE_NAME=learn_bridge_ai
MONGODB_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:8001

# Cloudinary
CLOUDINARY_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Email
RESEND_API_KEY=xxx
EMAIL_USER=xxx
EMAIL_PASSWORD=xxx

# JWT
ACCESS_TOKEN_SECRET=your_secret_key_here
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRY=7d

# Multer
MULTER_MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8001
```

---

## 🎯 Key Features Workflow

### 1. User Registration & Authentication
```
User → Signup Form → Backend (Register)
→ Hash Password & Create User → Send OTP email
→ User enters OTP → Verify OTP
→ Generate JWT tokens → Redirect to Dashboard
```

### 2. CV Upload & Roadmap Generation
```
User → Upload CV + Select Role → Backend (Process)
→ Upload to Cloudinary → Extract text (OCR)
→ Add to Job Queue → AI Service processes
→ Generate roadmap with skills & resources
→ Save to Database → Return to Frontend
```

### 3. Roadmap Management
```
User → View roadmaps → Select roadmap
→ View detailed steps, skills, timeline
→ See learning resources for each step
→ Save/Export/Delete roadmap
```

### 4. Learning Path
```
Roadmap → View Phase → See detailed skills
→ Access learning resources
→ Track progress through milestones
→ Complete phase and move to next
```

---

## 🚨 Troubleshooting

### Common Issues

**Frontend won't connect to Backend**
- Check backend is running on port 8000
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings in backend

**CV Upload fails**
- Verify Cloudinary credentials
- Check file size (max 10MB)
- Ensure MongoDB is connected

**Roadmap generation times out**
- Check AI provider API key
- Verify internet connection
- Check AI service logs for errors

**Email not sending**
- Verify Resend/Nodemailer credentials
- Check email configuration in backend
- Review email service logs

---

## 📈 Future Enhancements

- [ ] Quiz/Assessment system for skill verification
- [ ] Progress tracking dashboard
- [ ] Recommendation engine for learning resources
- [ ] Real-time progress notifications
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and insights
- [ ] Peer learning & mentorship matching
- [ ] Integration with job boards
- [ ] AI-powered interview prep
- [ ] Multiple language support

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 👥 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support & Contact

For support, email: support@learnbridgeai.com

---

## 🙏 Acknowledgments

- FastAPI & Starlette teams
- Express.js community
- Next.js and Vercel team
- MongoDB & Mongoose team
- All open-source contributors

---

**Last Updated**: February 15, 2026  
**Version**: 1.0.0
