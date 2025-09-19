# Finora Web Application

A comprehensive Next.js web application for stock portfolio management with real-time market data, interactive charts, and advanced analytics.

## 🚀 Features

### Core Functionality
- **Portfolio Management**: Track and manage your stock investments
- **Real-time Market Data**: Live stock prices and market updates
- **Interactive Charts**: Advanced data visualization with Recharts
- **User Authentication**: Secure JWT-based authentication
- **Responsive Design**: Mobile-first design with Material-UI
- **Progressive Web App**: PWA support with offline capabilities

### Advanced Features
- **Real-time Updates**: WebSocket integration for live data
- **Data Export**: Export portfolio data in multiple formats
- **Performance Analytics**: Detailed portfolio performance metrics
- **Stock Search**: Intelligent stock symbol search
- **Price Alerts**: Customizable price alert system
- **Group Management**: Organize stocks into custom groups

## 🛠 Technology Stack

### Frontend
- **Next.js 13**: React framework with App Router
- **TypeScript**: Type-safe development
- **Material-UI (MUI)**: Modern React UI framework
- **Zustand**: Lightweight state management
- **React Query**: Server state management
- **Recharts**: Data visualization library
- **React Hook Form**: Form handling with validation
- **Yup**: Schema validation

### Charts & Visualization
- **Recharts**: Line charts, area charts, bar charts
- **Chart.js**: Advanced charting capabilities
- **React-Chartjs-2**: Chart.js integration for React

### PWA & Performance
- **Next-PWA**: Progressive Web App features
- **Workbox**: Service worker management
- **Bundle Analyzer**: Performance optimization

## 📁 Project Structure

```
packages/web/
├── public/                 # Static assets
│   ├── icons/             # PWA icons
│   ├── manifest.json      # PWA manifest
│   └── favicon.ico        # Favicon
├── src/
│   ├── components/        # Reusable components
│   │   ├── Layout.tsx     # Main layout component
│   │   ├── portfolio/     # Portfolio-specific components
│   │   ├── charts/        # Chart components
│   │   ├── market/        # Market data components
│   │   └── dashboard/     # Dashboard components
│   ├── pages/             # Next.js pages
│   │   ├── _app.tsx       # App configuration
│   │   ├── index.tsx      # Dashboard page
│   │   ├── auth/          # Authentication pages
│   │   ├── portfolio/     # Portfolio pages
│   │   └── market/        # Market pages
│   ├── services/          # API services
│   │   ├── api.ts         # Base API service
│   │   ├── authService.ts # Authentication service
│   │   ├── stockService.ts# Stock data service
│   │   └── portfolioService.ts # Portfolio service
│   ├── store/             # State management
│   │   ├── authStore.ts   # Authentication state
│   │   └── portfolioStore.ts # Portfolio state
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   └── styles/            # Global styles
├── next.config.js         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Backend API running (see packages/backend)

### Installation

1. **Install dependencies**:
   ```bash
   cd packages/web
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Update the environment variables:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   NEXT_PUBLIC_WS_URL=ws://localhost:3002
   NEXT_PUBLIC_APP_NAME=Finora
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000`

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start

# Export static files (optional)
npm run export
```

## 📱 Progressive Web App

The application includes full PWA support:

- **Offline Functionality**: Works without internet connection
- **Install Prompt**: Can be installed on mobile devices
- **Push Notifications**: Real-time alerts and updates
- **Background Sync**: Data synchronization when online
- **App Shortcuts**: Quick access to key features

### PWA Features
- Service Worker for caching
- Web App Manifest
- Offline fallback pages
- Background sync
- Push notifications

## 🎨 UI Components

### Layout Components
- **Layout**: Main application layout with navigation
- **Navigation**: Responsive sidebar navigation
- **Header**: Top navigation bar with user menu

### Portfolio Components
- **PortfolioSummaryCard**: Overview of portfolio performance
- **StockList**: Tabular display of stocks
- **PerformanceChart**: Portfolio performance visualization
- **AllocationChart**: Portfolio allocation breakdown

### Chart Components
- **LineChart**: Time series data visualization
- **AreaChart**: Filled area charts for trends
- **PieChart**: Portfolio allocation display
- **CandlestickChart**: Stock price charts

### Market Components
- **MarketSummary**: Major market indices
- **TrendingStocks**: Popular stocks display
- **MarketMovers**: Top gainers and losers

## 🔐 Authentication

The application uses JWT-based authentication:

- **Login/Register**: Email and password authentication
- **Token Management**: Automatic token refresh
- **Protected Routes**: Route-level authentication
- **User Profile**: Profile management

### Authentication Flow
1. User logs in with credentials
2. Server returns JWT token and refresh token
3. Token stored in localStorage
4. API requests include Authorization header
5. Automatic token refresh on expiry

## 📊 State Management

### Zustand Stores

#### Auth Store (`authStore.ts`)
- User authentication state
- Login/logout functionality
- Token management
- Profile updates

#### Portfolio Store (`portfolioStore.ts`)
- Portfolio data management
- Stock CRUD operations
- Performance metrics
- Group management

### React Query
- Server state caching
- Background updates
- Optimistic updates
- Error handling

## 🌐 API Integration

### Services Architecture

#### Base API Service (`api.ts`)
- HTTP client configuration
- Request/response interceptors
- Error handling
- Token management

#### Domain Services
- **AuthService**: Authentication operations
- **StockService**: Market data operations
- **PortfolioService**: Portfolio management

### API Endpoints
- `POST /auth/login` - User authentication
- `GET /portfolio` - Get user portfolio
- `GET /market/stock/:symbol` - Get stock data
- `GET /market/summary` - Market overview
- `POST /portfolio/stocks` - Add stock to portfolio

## 📈 Charts and Analytics

### Chart Types
- **Line Charts**: Portfolio performance over time
- **Area Charts**: Filled trend visualization
- **Bar Charts**: Comparative data display
- **Pie Charts**: Portfolio allocation
- **Candlestick Charts**: Stock price movements

### Analytics Features
- Portfolio performance metrics
- Risk analysis
- Sector allocation
- Historical comparisons
- Benchmark comparisons

## 🎯 Performance Optimization

### Code Splitting
- Route-based code splitting
- Component lazy loading
- Dynamic imports

### Caching Strategy
- API response caching
- Static asset caching
- Service worker caching

### Bundle Optimization
- Tree shaking
- Bundle analysis
- Image optimization
- Font optimization

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run type checking
npm run type-check
```

### Testing Stack
- Jest for unit testing
- React Testing Library
- TypeScript type checking
- ESLint for code quality

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker
```bash
# Build Docker image
docker build -t finora-web .

# Run container
docker run -p 3000:3000 finora-web
```

### Static Export
```bash
# Generate static files
npm run export

# Deploy to any static hosting
```

## 🔧 Configuration

### Next.js Configuration (`next.config.js`)
- PWA configuration
- Bundle analyzer
- Environment variables
- Image optimization

### TypeScript Configuration (`tsconfig.json`)
- Path aliases
- Strict type checking
- Module resolution

## 📱 Mobile Responsiveness

- Mobile-first design approach
- Responsive breakpoints
- Touch-friendly interactions
- Optimized for mobile performance

## 🌟 Key Features Implemented

✅ **Dashboard**: Complete portfolio overview
✅ **Authentication**: Secure login/register system
✅ **Portfolio Management**: Add, edit, remove stocks
✅ **Real-time Data**: Live market data integration
✅ **Interactive Charts**: Performance visualization
✅ **Market Overview**: Trending stocks and market data
✅ **Responsive Design**: Mobile and desktop optimized
✅ **PWA Support**: Installable web application
✅ **State Management**: Efficient data management
✅ **Type Safety**: Full TypeScript implementation

## 🔮 Future Enhancements

- Advanced charting with technical indicators
- Social features and stock discussions
- AI-powered investment recommendations
- Advanced portfolio analytics
- Multi-currency support
- Dark mode theme
- Advanced filtering and sorting
- Watchlist functionality
- News integration
- Calendar integration for earnings

## 📄 License

This project is part of the Finora application suite.
