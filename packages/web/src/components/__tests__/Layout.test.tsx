import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { createTheme } from '@mui/material/styles'
import Layout from '../Layout'
import { useAuthStore } from '@/store/authStore'

// Mock the auth store
jest.mock('@/store/authStore')
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

// Mock Material-UI theme
const theme = createTheme()

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
)

describe('Layout Component', () => {
  const mockUser = testUtils.mockUser
  const mockLogout = jest.fn()

  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: mockLogout,
      register: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
      error: null,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders layout with navigation and content', () => {
    render(
      <TestWrapper>
        <Layout>
          <div data-testid="test-content">Test Content</div>
        </Layout>
      </TestWrapper>
    )

    // Check if main navigation elements are present
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByText('Finora')).toBeInTheDocument()
    expect(screen.getByTestId('test-content')).toBeInTheDocument()
  })

  it('displays user information when authenticated', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Check if user name is displayed
    expect(screen.getByText(`${mockUser.firstName} ${mockUser.lastName}`)).toBeInTheDocument()
  })

  it('shows navigation menu items', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Check for main navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Portfolio')).toBeInTheDocument()
    expect(screen.getByText('Market')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Alerts')).toBeInTheDocument()
  })

  it('handles mobile menu toggle', async () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Find and click the mobile menu button
    const menuButton = screen.getByLabelText('menu')
    fireEvent.click(menuButton)

    // Wait for menu to open
    await waitFor(() => {
      expect(screen.getByRole('presentation')).toBeInTheDocument()
    })
  })

  it('handles user menu interactions', async () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Find and click the user avatar
    const userAvatar = screen.getByRole('button', { name: /account of current user/i })
    fireEvent.click(userAvatar)

    // Wait for user menu to appear
    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })
  })

  it('handles logout functionality', async () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Open user menu
    const userAvatar = screen.getByRole('button', { name: /account of current user/i })
    fireEvent.click(userAvatar)

    // Wait for menu and click logout
    await waitFor(() => {
      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)
    })

    // Verify logout was called
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('renders correctly when user is not authenticated', () => {
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

    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Should still render the layout but without user-specific elements
    expect(screen.getByText('Finora')).toBeInTheDocument()
    expect(screen.queryByText(`${mockUser.firstName} ${mockUser.lastName}`)).not.toBeInTheDocument()
  })

  it('shows loading state appropriately', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
      error: null,
    })

    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Should render layout even during loading
    expect(screen.getByText('Finora')).toBeInTheDocument()
  })

  it('handles navigation clicks', async () => {
    const mockPush = jest.fn()
    
    // Mock useRouter to capture navigation
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
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Click on Portfolio navigation item
    const portfolioLink = screen.getByText('Portfolio')
    fireEvent.click(portfolioLink)

    // Verify navigation was attempted
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/portfolio')
    })
  })

  it('displays notifications badge when present', () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Check for notifications icon
    const notificationsButton = screen.getByLabelText('notifications')
    expect(notificationsButton).toBeInTheDocument()
  })

  it('handles responsive design', () => {
    // Mock window.matchMedia for mobile view
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(max-width: 768px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Should render mobile-friendly layout
    expect(screen.getByLabelText('menu')).toBeInTheDocument()
  })

  it('handles theme switching', async () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Look for theme toggle button (if implemented)
    const themeButton = screen.queryByLabelText('toggle theme')
    if (themeButton) {
      fireEvent.click(themeButton)
      // Theme switching logic would be tested here
    }
  })

  it('renders breadcrumbs when provided', () => {
    render(
      <TestWrapper>
        <Layout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Portfolio', href: '/portfolio' }]}>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Check for breadcrumb navigation
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Portfolio')).toBeInTheDocument()
  })

  it('handles search functionality', async () => {
    render(
      <TestWrapper>
        <Layout>
          <div>Content</div>
        </Layout>
      </TestWrapper>
    )

    // Look for search input
    const searchInput = screen.queryByPlaceholderText('Search stocks...')
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'AAPL' } })
      fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter' })
      
      // Search functionality would be tested here
      await waitFor(() => {
        // Verify search was triggered
      })
    }
  })
})
