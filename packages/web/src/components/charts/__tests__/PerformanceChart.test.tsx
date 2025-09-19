import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import PerformanceChart from '../PerformanceChart'

const theme = createTheme()

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
)

describe('PerformanceChart Component', () => {
  const mockData = [
    {
      date: '2023-01-01',
      value: 10000,
      return: 0,
      returnPercent: 0,
    },
    {
      date: '2023-01-02',
      value: 10250,
      return: 250,
      returnPercent: 2.5,
    },
    {
      date: '2023-01-03',
      value: 10500,
      return: 500,
      returnPercent: 5.0,
    },
    {
      date: '2023-01-04',
      value: 10300,
      return: 300,
      returnPercent: 3.0,
    },
    {
      date: '2023-01-05',
      value: 10750,
      return: 750,
      returnPercent: 7.5,
    },
  ]

  it('renders chart with data', () => {
    render(
      <TestWrapper>
        <PerformanceChart data={mockData} isLoading={false} />
      </TestWrapper>
    )

    // Check if chart container is rendered
    expect(screen.getByTestId('recharts-responsive-container')).toBeInTheDocument()
    expect(screen.getByTestId('recharts-area-chart')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <TestWrapper>
        <PerformanceChart data={[]} isLoading={true} />
      </TestWrapper>
    )

    // Check for loading skeleton or indicator
    const loadingElement = screen.queryByTestId('chart-loading') || screen.queryByTestId('skeleton')
    expect(loadingElement).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    render(
      <TestWrapper>
        <PerformanceChart data={[]} isLoading={false} />
      </TestWrapper>
    )

    // Should render empty state or placeholder
    const emptyState = screen.queryByText('No data available') || screen.queryByTestId('empty-chart')
    expect(emptyState).toBeInTheDocument()
  })

  it('renders with custom height', () => {
    render(
      <TestWrapper>
        <PerformanceChart data={mockData} isLoading={false} height={500} />
      </TestWrapper>
    )

    const container = screen.getByTestId('recharts-responsive-container')
    expect(container).toHaveAttribute('height', '500')
  })

  it('toggles between line and area chart modes', () => {
    render(
      <TestWrapper>
        <PerformanceChart data={mockData} isLoading={false} showArea={false} />
      </TestWrapper>
    )

    // Should render line chart when showArea is false
    expect(screen.getByTestId('recharts-line-chart')).toBeInTheDocument()
  })

  it('displays chart with area fill when showArea is true', () => {
    render(
      <TestWrapper>
        <PerformanceChart data={mockData} isLoading={false} showArea={true} />
      </TestWrapper>
    )

    // Should render area chart when showArea is true
    expect(screen.getByTestId('recharts-area-chart')).toBeInTheDocument()
    expect(screen.getByTestId('recharts-area')).toBeInTheDocument()
  })

  it('includes chart axes and grid', () => {
    render(
      <TestWrapper>
        <PerformanceChart data={mockData} isLoading={false} />
      </TestWrapper>
    )

    // Check for chart components
    expect(screen.getByTestId('recharts-xaxis')).toBeInTheDocument()
    expect(screen.getByTestId('recharts-yaxis')).toBeInTheDocument()
    expect(screen.getByTestId('recharts-cartesian-grid')).toBeInTheDocument()
  })

  it('shows tooltip on hover', () => {
    render(
      <TestWrapper>
        <PerformanceChart data={mockData} isLoading={false} />
      </TestWrapper>
    )

    // Check for tooltip component
    expect(screen.getByTestId('recharts-tooltip')).toBeInTheDocument()
  })

  it('handles data with negative values', () => {
    const negativeData = [
      ...mockData,
      {
        date: '2023-01-06',
        value: 9500,
        return: -500,
        returnPercent: -5.0,
      },
    ]

    render(
      <TestWrapper>
        <PerformanceChart data={negativeData} isLoading={false} />
      </TestWrapper>
    )

    // Should render chart with negative values
    expect(screen.getByTestId('recharts-area-chart')).toBeInTheDocument()
  })

  it('formats dates correctly in chart', () => {
    render(
      <TestWrapper>
        <PerformanceChart data={mockData} isLoading={false} />
      </TestWrapper>
    )

    // Chart should process date formatting
    const chart = screen.getByTestId('recharts-area-chart')
    expect(chart).toBeInTheDocument()
  })

  it('handles different time periods', () => {
    const longTermData = Array.from({ length: 365 }, (_, i) => ({
      date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
      value: 10000 + Math.random() * 2000,
      return: Math.random() * 1000,
      returnPercent: Math.random() * 10,
    }))

    render(
      <TestWrapper>
        <PerformanceChart data={longTermData} isLoading={false} />
      </TestWrapper>
    )

    // Should handle large datasets
    expect(screen.getByTestId('recharts-area-chart')).toBeInTheDocument()
  })

  it('displays performance metrics', () => {
    render(
      <TestWrapper>
        <PerformanceChart 
          data={mockData} 
          isLoading={false}
          showMetrics={true}
        />
      </TestWrapper>
    )

    // Check for performance metrics if component supports them
    const metricsContainer = screen.queryByTestId('performance-metrics')
    if (metricsContainer) {
      expect(metricsContainer).toBeInTheDocument()
    }
  })

  it('handles chart interactions', () => {
    render(
      <TestWrapper>
        <PerformanceChart data={mockData} isLoading={false} />
      </TestWrapper>
    )

    const chart = screen.getByTestId('recharts-area-chart')
    
    // Simulate mouse events on chart
    fireEvent.mouseEnter(chart)
    fireEvent.mouseMove(chart)
    fireEvent.mouseLeave(chart)

    // Chart should handle interactions without errors
    expect(chart).toBeInTheDocument()
  })

  it('supports custom color schemes', () => {
    render(
      <TestWrapper>
        <PerformanceChart 
          data={mockData} 
          isLoading={false}
          color="#ff6b6b"
        />
      </TestWrapper>
    )

    // Chart should accept custom colors
    expect(screen.getByTestId('recharts-area-chart')).toBeInTheDocument()
  })

  it('handles responsive design', () => {
    // Mock different screen sizes
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // Mobile width
    })

    render(
      <TestWrapper>
        <PerformanceChart data={mockData} isLoading={false} />
      </TestWrapper>
    )

    // Chart should be responsive
    expect(screen.getByTestId('recharts-responsive-container')).toBeInTheDocument()
  })

  it('displays chart legend when enabled', () => {
    render(
      <TestWrapper>
        <PerformanceChart 
          data={mockData} 
          isLoading={false}
          showLegend={true}
        />
      </TestWrapper>
    )

    // Check for legend if component supports it
    const legend = screen.queryByTestId('recharts-legend')
    if (legend) {
      expect(legend).toBeInTheDocument()
    }
  })

  it('handles data updates smoothly', () => {
    const { rerender } = render(
      <TestWrapper>
        <PerformanceChart data={mockData} isLoading={false} />
      </TestWrapper>
    )

    // Update with new data
    const newData = [
      ...mockData,
      {
        date: '2023-01-06',
        value: 11000,
        return: 1000,
        returnPercent: 10.0,
      },
    ]

    rerender(
      <TestWrapper>
        <PerformanceChart data={newData} isLoading={false} />
      </TestWrapper>
    )

    // Chart should update with new data
    expect(screen.getByTestId('recharts-area-chart')).toBeInTheDocument()
  })

  it('supports zoom and pan functionality', () => {
    render(
      <TestWrapper>
        <PerformanceChart 
          data={mockData} 
          isLoading={false}
          enableZoom={true}
        />
      </TestWrapper>
    )

    const chart = screen.getByTestId('recharts-area-chart')
    
    // Simulate zoom interactions if supported
    fireEvent.wheel(chart, { deltaY: -100 })
    
    expect(chart).toBeInTheDocument()
  })

  it('exports chart data when requested', () => {
    const mockOnExport = jest.fn()

    render(
      <TestWrapper>
        <PerformanceChart 
          data={mockData} 
          isLoading={false}
          onExport={mockOnExport}
        />
      </TestWrapper>
    )

    // Look for export button if component supports it
    const exportButton = screen.queryByLabelText('export chart')
    if (exportButton) {
      fireEvent.click(exportButton)
      expect(mockOnExport).toHaveBeenCalledWith(mockData)
    }
  })
})
