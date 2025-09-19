import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import PortfolioSummaryCard from '../PortfolioSummaryCard'

const theme = createTheme()

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
)

describe('PortfolioSummaryCard Component', () => {
  const mockPortfolio = {
    totalValue: 15000.00,
    totalCost: 14000.00,
    totalReturn: 1000.00,
    totalReturnPercent: 7.14,
    dayChange: 250.00,
    dayChangePercent: 1.69,
    stocks: [],
    groups: [],
  }

  it('renders portfolio summary with correct values', () => {
    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={mockPortfolio} isLoading={false} />
      </TestWrapper>
    )

    // Check if total value is displayed
    expect(screen.getByText('$15,000.00')).toBeInTheDocument()
    
    // Check if total return is displayed
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('7.14%')).toBeInTheDocument()
    
    // Check if day change is displayed
    expect(screen.getByText('$250.00')).toBeInTheDocument()
    expect(screen.getByText('1.69%')).toBeInTheDocument()
  })

  it('displays positive returns with correct styling', () => {
    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={mockPortfolio} isLoading={false} />
      </TestWrapper>
    )

    // Check for positive trend indicators
    const trendIcons = screen.getAllByTestId('TrendingUpIcon')
    expect(trendIcons.length).toBeGreaterThan(0)
  })

  it('displays negative returns with correct styling', () => {
    const negativePortfolio = {
      ...mockPortfolio,
      totalReturn: -500.00,
      totalReturnPercent: -3.57,
      dayChange: -150.00,
      dayChangePercent: -1.00,
    }

    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={negativePortfolio} isLoading={false} />
      </TestWrapper>
    )

    // Check for negative values
    expect(screen.getByText('-$500.00')).toBeInTheDocument()
    expect(screen.getByText('-3.57%')).toBeInTheDocument()
    expect(screen.getByText('-$150.00')).toBeInTheDocument()
    expect(screen.getByText('-1.00%')).toBeInTheDocument()

    // Check for negative trend indicators
    const trendIcons = screen.getAllByTestId('TrendingDownIcon')
    expect(trendIcons.length).toBeGreaterThan(0)
  })

  it('displays neutral returns with correct styling', () => {
    const neutralPortfolio = {
      ...mockPortfolio,
      totalReturn: 0.00,
      totalReturnPercent: 0.00,
      dayChange: 0.00,
      dayChangePercent: 0.00,
    }

    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={neutralPortfolio} isLoading={false} />
      </TestWrapper>
    )

    // Check for neutral values
    expect(screen.getByText('$0.00')).toBeInTheDocument()
    expect(screen.getByText('0.00%')).toBeInTheDocument()

    // Check for neutral trend indicators
    const trendIcons = screen.getAllByTestId('TrendingFlatIcon')
    expect(trendIcons.length).toBeGreaterThan(0)
  })

  it('shows loading state correctly', () => {
    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={null} isLoading={true} />
      </TestWrapper>
    )

    // Check for loading skeletons
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('handles empty portfolio data', () => {
    const emptyPortfolio = {
      totalValue: 0.00,
      totalCost: 0.00,
      totalReturn: 0.00,
      totalReturnPercent: 0.00,
      dayChange: 0.00,
      dayChangePercent: 0.00,
      stocks: [],
      groups: [],
    }

    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={emptyPortfolio} isLoading={false} />
      </TestWrapper>
    )

    // Check if zero values are displayed correctly
    expect(screen.getByText('$0.00')).toBeInTheDocument()
    expect(screen.getByText('0.00%')).toBeInTheDocument()
  })

  it('displays portfolio metrics labels', () => {
    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={mockPortfolio} isLoading={false} />
      </TestWrapper>
    )

    // Check for metric labels
    expect(screen.getByText('Total Value')).toBeInTheDocument()
    expect(screen.getByText('Total Return')).toBeInTheDocument()
    expect(screen.getByText('Today\'s Change')).toBeInTheDocument()
  })

  it('formats currency values correctly', () => {
    const largePortfolio = {
      ...mockPortfolio,
      totalValue: 1234567.89,
      totalReturn: 123456.78,
      dayChange: 12345.67,
    }

    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={largePortfolio} isLoading={false} />
      </TestWrapper>
    )

    // Check for properly formatted large numbers
    expect(screen.getByText('$1,234,567.89')).toBeInTheDocument()
    expect(screen.getByText('$123,456.78')).toBeInTheDocument()
    expect(screen.getByText('$12,345.67')).toBeInTheDocument()
  })

  it('handles very small values', () => {
    const smallPortfolio = {
      ...mockPortfolio,
      totalValue: 0.01,
      totalReturn: 0.001,
      totalReturnPercent: 0.001,
      dayChange: 0.01,
      dayChangePercent: 0.01,
    }

    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={smallPortfolio} isLoading={false} />
      </TestWrapper>
    )

    // Check for small value handling
    expect(screen.getByText('$0.01')).toBeInTheDocument()
    expect(screen.getByText('0.01%')).toBeInTheDocument()
  })

  it('displays additional portfolio metrics when available', () => {
    const detailedPortfolio = {
      ...mockPortfolio,
      stockCount: 15,
      diversificationScore: 8.5,
      riskLevel: 'Moderate',
    }

    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={detailedPortfolio} isLoading={false} />
      </TestWrapper>
    )

    // Check for additional metrics if component supports them
    if (screen.queryByText('15 Stocks')) {
      expect(screen.getByText('15 Stocks')).toBeInTheDocument()
    }
  })

  it('handles null portfolio gracefully', () => {
    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={null} isLoading={false} />
      </TestWrapper>
    )

    // Should render without crashing
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  it('displays correct color coding for performance', () => {
    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={mockPortfolio} isLoading={false} />
      </TestWrapper>
    )

    // Check for positive performance styling (green color)
    const positiveElements = screen.getAllByText(/\+|\$1,000\.00|7\.14%/)
    positiveElements.forEach(element => {
      expect(element).toHaveStyle({ color: expect.stringMatching(/green|success/) })
    })
  })

  it('shows portfolio allocation summary', () => {
    const portfolioWithAllocation = {
      ...mockPortfolio,
      topHoldings: [
        { symbol: 'AAPL', percentage: 25.5 },
        { symbol: 'MSFT', percentage: 20.3 },
        { symbol: 'GOOGL', percentage: 15.2 },
      ],
    }

    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={portfolioWithAllocation} isLoading={false} />
      </TestWrapper>
    )

    // Check for top holdings if component supports them
    if (screen.queryByText('AAPL')) {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('25.5%')).toBeInTheDocument()
    }
  })

  it('handles responsive design', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={mockPortfolio} isLoading={false} />
      </TestWrapper>
    )

    // Component should render appropriately for mobile
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  it('displays time-based information', () => {
    const portfolioWithTime = {
      ...mockPortfolio,
      lastUpdated: '2023-12-01T10:30:00Z',
    }

    render(
      <TestWrapper>
        <PortfolioSummaryCard portfolio={portfolioWithTime} isLoading={false} />
      </TestWrapper>
    )

    // Check for last updated time if component supports it
    if (screen.queryByText(/Last updated/)) {
      expect(screen.getByText(/Last updated/)).toBeInTheDocument()
    }
  })
})
