import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../components/App';

// Mock the RosterProvider to avoid context issues in tests
jest.mock('../contexts/RosterContext', () => ({
  RosterProvider: ({ children }) => <div data-testid="roster-provider">{children}</div>,
  useRoster: () => ({
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('App', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('renders login form when not authenticated', () => {
    renderWithProviders(<App />);
    
    // Should show login form
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  it('renders main layout when authenticated', () => {
    // Mock authenticated state
    localStorage.setItem('isAuthenticated', 'true');
    
    renderWithProviders(<App />);
    
    // Should show main layout
    expect(screen.getByTestId('roster-provider')).toBeInTheDocument();
  });
});
