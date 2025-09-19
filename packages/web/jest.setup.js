import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
      isLocaleDomain: false,
      isReady: true,
      defaultLocale: 'en',
      domainLocales: [],
      isPreview: false,
    }
  },
}))

// Mock Next.js Head component
jest.mock('next/head', () => {
  return function Head({ children }) {
    return <>{children}</>
  }
})

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function Link({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api'
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:3002'
process.env.NEXT_PUBLIC_APP_NAME = 'Finora'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock fetch
global.fetch = jest.fn()

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}))

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  ArcElement: jest.fn(),
  BarElement: jest.fn(),
}))

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options, ...props }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} {...props} />
  ),
  Bar: ({ data, options, ...props }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} {...props} />
  ),
  Pie: ({ data, options, ...props }) => (
    <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)} {...props} />
  ),
  Doughnut: ({ data, options, ...props }) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} {...props} />
  ),
}))

// Mock Recharts
jest.mock('recharts', () => ({
  LineChart: ({ children, ...props }) => (
    <div data-testid="recharts-line-chart" {...props}>
      {children}
    </div>
  ),
  AreaChart: ({ children, ...props }) => (
    <div data-testid="recharts-area-chart" {...props}>
      {children}
    </div>
  ),
  BarChart: ({ children, ...props }) => (
    <div data-testid="recharts-bar-chart" {...props}>
      {children}
    </div>
  ),
  PieChart: ({ children, ...props }) => (
    <div data-testid="recharts-pie-chart" {...props}>
      {children}
    </div>
  ),
  Line: (props) => <div data-testid="recharts-line" {...props} />,
  Area: (props) => <div data-testid="recharts-area" {...props} />,
  Bar: (props) => <div data-testid="recharts-bar" {...props} />,
  Pie: (props) => <div data-testid="recharts-pie" {...props} />,
  Cell: (props) => <div data-testid="recharts-cell" {...props} />,
  XAxis: (props) => <div data-testid="recharts-xaxis" {...props} />,
  YAxis: (props) => <div data-testid="recharts-yaxis" {...props} />,
  CartesianGrid: (props) => <div data-testid="recharts-cartesian-grid" {...props} />,
  Tooltip: (props) => <div data-testid="recharts-tooltip" {...props} />,
  Legend: (props) => <div data-testid="recharts-legend" {...props} />,
  ResponsiveContainer: ({ children, ...props }) => (
    <div data-testid="recharts-responsive-container" {...props}>
      {children}
    </div>
  ),
}))

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn(),
        eject: jest.fn(),
      },
    },
  })),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn(),
    },
    response: {
      use: jest.fn(),
      eject: jest.fn(),
    },
  },
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}))

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  })),
}))

// Global test utilities
global.testUtils = {
  // Mock user data
  mockUser: {
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isVerified: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  },

  // Mock stock data
  mockStock: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 150.25,
    change: 2.50,
    changePercent: 1.69,
    volume: 1000000,
    marketCap: 2500000000000,
    peRatio: 25.5,
    dividendYield: 0.5,
    fiftyTwoWeekHigh: 180.00,
    fiftyTwoWeekLow: 120.00,
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Consumer Electronics',
  },

  // Mock portfolio data
  mockPortfolio: {
    totalValue: 15000.00,
    totalCost: 14000.00,
    totalReturn: 1000.00,
    totalReturnPercent: 7.14,
    dayChange: 250.00,
    dayChangePercent: 1.69,
    stocks: [],
    groups: [],
  },

  // Mock API responses
  mockApiResponse: (data, success = true) => ({
    success,
    data,
    message: success ? 'Success' : 'Error',
  }),

  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Create mock functions
  createMockFunction: (returnValue) => jest.fn().mockResolvedValue(returnValue),

  // Mock localStorage operations
  mockLocalStorage: {
    setItem: (key, value) => {
      localStorageMock.setItem(key, JSON.stringify(value))
    },
    getItem: (key) => {
      const item = localStorageMock.getItem(key)
      return item ? JSON.parse(item) : null
    },
    removeItem: (key) => {
      localStorageMock.removeItem(key)
    },
    clear: () => {
      localStorageMock.clear()
    },
  },
}

// Setup and teardown
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
  
  // Reset localStorage
  localStorageMock.clear()
  sessionStorageMock.clear()
  
  // Reset fetch mock
  fetch.mockClear()
})

afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks()
})
