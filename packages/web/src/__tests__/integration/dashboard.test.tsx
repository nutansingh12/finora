import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from 'react-query'
import Dashboard from '@/pages/index'
import { useAuthStore } from '@/store/authStore'
import { usePortfolioStore } from '@/store/portfolioStore'
import axios from 'axios'

// Mock stores
jest.mock('@/store/authStore')
jest.mock('@/store/portfolioStore')
jest.mock('axios')

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>
const mockUsePortfolioStore = usePortfolioStore as jest.MockedFunction<typeof usePortfolioStore>
const mockAxios = axios as jest.Mocked<typeof axios>

const theme = createTheme()
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  </QueryClientProvider>
)

describe('Dashboard Integration Tests', () => {
  const mockUser = testUtils.mockUser
  const mockPortfolio = testUtils.mockPortfolio
  const mockStocks = [
    {
      id: '1',
      userId: mockUser.id,
      symbol: 'AAPL',
      quantity: 10,
      averagePrice: 145.00,
      currentPrice: 150.25,
      totalValue: 1502.50,
      gainLoss: 52.50,
      gainLossPercent: 3.62,
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      stock: testUtils.mockStock,
    },
  ]

  const mockPerformance = {
    totalReturn: 1000.00,
    totalReturnPercent: 7.14,
    annualizedReturn: 8.5,
    volatility: 15.2,
    sharpeRatio: 0.56,
    historicalValues: [
      { date: '2023-01-01', value: 14000 },
      { date: '2023-01-02', value: 14250 },
      { date: '2023-01-03', value: 14500 },
      { date: '2023-01-04', value: 14300 },
      { date: '2023-01-05', value: 15000 },
    ],
  }

  beforeEach(() => {
    // Mock authenticated user
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
      error: null,
    })

    // Mock portfolio store
    mockUsePortfolioStore.mockReturnValue({
      portfolio: mockPortfolio,
      stocks: mockStocks,
      groups: [],
      performance: mockPerformance,
      isLoading: false,
      error: null,
      fetchPortfolio: jest.fn(),
      fetchPerformance: jest.fn(),
      addStock: jest.fn(),
      updateStock: jest.fn(),
      removeStock: jest.fn(),
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
    })

    // Mock API responses
    mockAxios.get.mockResolvedValue({
      data: testUtils.mockApiResponse(mockPortfolio),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    queryClient.clear()
  })

  it('renders dashboard with portfolio data', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    // Check portfolio summary
    expect(screen.getByText('$15,000.00')).toBeInTheDocument()
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('7.14%')).toBeInTheDocument()

    // Check if performance chart is rendered
    expect(screen.getByTestId('recharts-responsive-container')).toBeInTheDocument()
  })

  it('displays stock list with current holdings', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
    })

    // Check stock details
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByText('$150.25')).toBeInTheDocument()
    expect(screen.getByText('$52.50')).toBeInTheDocument()
    expect(screen.getByText('3.62%')).toBeInTheDocument()
  })

  it('shows market summary data', async () => {
    // Mock market data
    const mockMarketData = [
      {
        name: 'S&P 500',
        symbol: '^GSPC',
        price: 4500.25,
        change: 25.50,
        changePercent: 0.57,
      },
      {
        name: 'Dow Jones',
        symbol: '^DJI',
        price: 35000.75,
        change: -50.25,
        changePercent: -0.14,
      },
    ]

    mockAxios.get.mockResolvedValueOnce({
      data: testUtils.mockApiResponse(mockMarketData),
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Market Overview')).toBeInTheDocument()
    })

    // Check market indices
    expect(screen.getByText('S&P 500')).toBeInTheDocument()
    expect(screen.getByText('4,500.25')).toBeInTheDocument()
    expect(screen.getByText('Dow Jones')).toBeInTheDocument()
    expect(screen.getByText('35,000.75')).toBeInTheDocument()
  })

  it('handles loading states correctly', () => {
    // Mock loading state
    mockUsePortfolioStore.mockReturnValue({
      portfolio: null,
      stocks: [],
      groups: [],
      performance: null,
      isLoading: true,
      error: null,
      fetchPortfolio: jest.fn(),
      fetchPerformance: jest.fn(),
      addStock: jest.fn(),
      updateStock: jest.fn(),
      removeStock: jest.fn(),
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Check for loading indicators
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('handles error states gracefully', async () => {
    // Mock error state
    mockUsePortfolioStore.mockReturnValue({
      portfolio: null,
      stocks: [],
      groups: [],
      performance: null,
      isLoading: false,
      error: 'Failed to fetch portfolio data',
      fetchPortfolio: jest.fn(),
      fetchPerformance: jest.fn(),
      addStock: jest.fn(),
      updateStock: jest.fn(),
      removeStock: jest.fn(),
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch portfolio data')).toBeInTheDocument()
    })
  })

  it('navigates to portfolio page when clicking view all', async () => {
    const mockPush = jest.fn()
    
    require('next/router').useRouter.mockReturnValue({
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: mockPush,
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
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      const viewAllButton = screen.getByText('View All')
      fireEvent.click(viewAllButton)
    })

    expect(mockPush).toHaveBeenCalledWith('/portfolio')
  })

  it('displays quick actions correctly', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Add Stock')).toBeInTheDocument()
    })

    // Check for quick action buttons
    expect(screen.getByText('View Portfolio')).toBeInTheDocument()
    expect(screen.getByText('Market Analysis')).toBeInTheDocument()
    expect(screen.getByText('Set Alert')).toBeInTheDocument()
  })

  it('handles quick action clicks', async () => {
    const mockPush = jest.fn()
    
    require('next/router').useRouter.mockReturnValue({
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: mockPush,
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
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      const addStockButton = screen.getByText('Add Stock')
      fireEvent.click(addStockButton)
    })

    expect(mockPush).toHaveBeenCalledWith('/portfolio/add-stock')
  })

  it('updates data when user performs actions', async () => {
    const mockFetchPortfolio = jest.fn()
    const mockFetchPerformance = jest.fn()

    mockUsePortfolioStore.mockReturnValue({
      portfolio: mockPortfolio,
      stocks: mockStocks,
      groups: [],
      performance: mockPerformance,
      isLoading: false,
      error: null,
      fetchPortfolio: mockFetchPortfolio,
      fetchPerformance: mockFetchPerformance,
      addStock: jest.fn(),
      updateStock: jest.fn(),
      removeStock: jest.fn(),
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    // Verify initial data fetch
    await waitFor(() => {
      expect(mockFetchPortfolio).toHaveBeenCalled()
      expect(mockFetchPerformance).toHaveBeenCalled()
    })
  })

  it('handles real-time data updates', async () => {
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    // Simulate real-time price update
    const updatedStocks = [
      {
        ...mockStocks[0],
        currentPrice: 155.00,
        totalValue: 1550.00,
        gainLoss: 100.00,
        gainLossPercent: 6.90,
      },
    ]

    // Update store with new data
    mockUsePortfolioStore.mockReturnValue({
      portfolio: {
        ...mockPortfolio,
        totalValue: 15500.00,
        dayChange: 500.00,
        dayChangePercent: 3.33,
      },
      stocks: updatedStocks,
      groups: [],
      performance: mockPerformance,
      isLoading: false,
      error: null,
      fetchPortfolio: jest.fn(),
      fetchPerformance: jest.fn(),
      addStock: jest.fn(),
      updateStock: jest.fn(),
      removeStock: jest.fn(),
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
    })

    // Re-render with updated data
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('$15,500.00')).toBeInTheDocument()
      expect(screen.getByText('$155.00')).toBeInTheDocument()
    })
  })

  it('redirects unauthenticated users', async () => {
    const mockPush = jest.fn()
    
    // Mock unauthenticated state
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
      error: null,
    })

    require('next/router').useRouter.mockReturnValue({
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: mockPush,
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
    })

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })
  })
})
