# PathFinder App

A React-based web application to help users find internships and research opportunities based on their profile.

## Features

- **Authentication**: Sign In / Sign Up forms with mock authentication
- **Profile Management**: Collect and store user information including education, skills, interests, experience, and resume upload
- **Dashboard**: Display matched opportunities with filtering and sorting capabilities
- **AI Workshop**: Tools for essay drafting, email drafting, and application guidance with mock AI responses
- **Protected Routes**: Navigation bar and route protection for authenticated users

## Tech Stack

- React 19 with Vite
- React Router DOM for routing
- Context API for global state management
- Functional components with hooks

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
src/
├── components/
│   ├── Navbar.jsx          # Navigation bar component
│   └── ProtectedRoute.jsx  # Route protection wrapper
├── context/
│   └── UserContext.jsx     # Global user state management
├── pages/
│   ├── Auth.jsx            # Landing page with authentication
│   ├── Profile.jsx         # User profile form
│   ├── Dashboard.jsx       # Opportunities dashboard
│   └── Workshop.jsx        # AI-assisted tools
├── utils/                  # Utility functions (if needed)
├── App.jsx                 # Main app component with routing
├── main.jsx                # App entry point
└── index.css               # Global styles
```

## Mock Data

The application uses mock data for:
- User authentication (no real backend)
- Opportunity scraping (predefined opportunities)
- AI responses (static mock responses)
- Resume storage (UI only, no actual file processing)

## Routes

- `/` - Authentication page
- `/profile` - User profile (protected)
- `/dashboard` - Opportunities dashboard (protected)
- `/workshop` - AI workshop tools (protected)
