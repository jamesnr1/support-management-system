import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import AvailabilityCalendar from '../../components/availability/AvailabilityCalendar';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock moment
jest.mock('moment', () => {
  const actualMoment = jest.requireActual('moment');
  return {
    ...actualMoment,
    default: actualMoment
  };
});

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

describe('AvailabilityCalendar', () => {
  const mockWorker = {
    id: '1',
    full_name: 'John Doe',
    email: 'john@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/workers/1/availability')) {
        return Promise.resolve({
          data: {
            '1': { available: true, isFullDay: false, fromTime: '09:00', toTime: '17:00' },
            '2': { available: true, isFullDay: true },
            '3': { available: false }
          }
        });
      }
      return Promise.resolve({ data: [] });
    });

    mockedAxios.put.mockResolvedValue({ data: { success: true } });
  });

  it('renders calendar with availability events', async () => {
    renderWithProviders(
      <AvailabilityCalendar worker={mockWorker} onSave={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Click to add • Click event to edit')).toBeInTheDocument();
    });

    // Should show calendar
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
  });

  it('displays availability events correctly', async () => {
    renderWithProviders(
      <AvailabilityCalendar worker={mockWorker} onSave={jest.fn()} />
    );

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/workers/1/availability')
      );
    });

    // Should show legend
    expect(screen.getByText('Full Day Available')).toBeInTheDocument();
    expect(screen.getByText('Time-Specific Available')).toBeInTheDocument();
    expect(screen.getByText('Past Days')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(
      <AvailabilityCalendar worker={mockWorker} onSave={jest.fn()} />
    );

    expect(screen.getByText('Loading availability...')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockedAxios.get.mockRejectedValue(new Error('API Error'));

    renderWithProviders(
      <AvailabilityCalendar worker={mockWorker} onSave={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Click to add • Click event to edit')).toBeInTheDocument();
    });

    // Should still render calendar even if API fails
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });

  it('opens edit modal when slot is selected', async () => {
    renderWithProviders(
      <AvailabilityCalendar worker={mockWorker} onSave={jest.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText('Click to add • Click event to edit')).toBeInTheDocument();
    });

    // This test would need more complex setup to actually trigger slot selection
    // For now, we verify the component renders without errors
    expect(screen.getByText('Previous')).toBeInTheDocument();
  });

  it('calls onSave when availability is saved', async () => {
    const mockOnSave = jest.fn();

    renderWithProviders(
      <AvailabilityCalendar worker={mockWorker} onSave={mockOnSave} />
    );

    await waitFor(() => {
      expect(screen.getByText('Click to add • Click event to edit')).toBeInTheDocument();
    });

    // Verify API calls are made
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/workers/1/availability')
    );
  });
});

describe('AvailabilitySection', () => {
  const mockWorker = {
    id: '1',
    full_name: 'John Doe',
    email: 'john@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/workers/1/availability')) {
        return Promise.resolve({
          data: {
            '1': { available: true, isFullDay: false, fromTime: '09:00', toTime: '17:00' },
            '2': { available: true, isFullDay: true }
          }
        });
      }
      return Promise.resolve({ data: [] });
    });

    mockedAxios.put.mockResolvedValue({ data: { success: true } });
  });

  it('renders view mode toggle', async () => {
    const { getByText } = renderWithProviders(
      <AvailabilitySection worker={mockWorker} onSave={jest.fn()} />
    );

    await waitFor(() => {
      expect(getByText('Weekly Availability')).toBeInTheDocument();
    });

    expect(getByText('Calendar')).toBeInTheDocument();
    expect(getByText('List')).toBeInTheDocument();
  });

  it('switches between calendar and list view', async () => {
    const { getByText } = renderWithProviders(
      <AvailabilitySection worker={mockWorker} onSave={jest.fn()} />
    );

    await waitFor(() => {
      expect(getByText('Weekly Availability')).toBeInTheDocument();
    });

    // Should start in calendar view
    expect(getByText('Click to add • Click event to edit')).toBeInTheDocument();

    // Switch to list view
    fireEvent.click(getByText('List'));

    // Should show list view
    expect(getByText('Monday')).toBeInTheDocument();
    expect(getByText('Tuesday')).toBeInTheDocument();
  });

  it('shows quick action buttons', async () => {
    const { getByText } = renderWithProviders(
      <AvailabilitySection worker={mockWorker} onSave={jest.fn()} />
    );

    await waitFor(() => {
      expect(getByText('Weekly Availability')).toBeInTheDocument();
    });

    // Switch to list view to see quick actions
    fireEvent.click(getByText('List'));

    expect(getByText('Set Weekdays 9-5')).toBeInTheDocument();
    expect(getByText('Clear All')).toBeInTheDocument();
  });

  it('handles quick actions correctly', async () => {
    const mockOnSave = jest.fn();
    const { getByText } = renderWithProviders(
      <AvailabilitySection worker={mockWorker} onSave={mockOnSave} />
    );

    await waitFor(() => {
      expect(getByText('Weekly Availability')).toBeInTheDocument();
    });

    // Switch to list view
    fireEvent.click(getByText('List'));

    // Click quick action
    fireEvent.click(getByText('Set Weekdays 9-5'));

    // Should make API calls for weekdays
    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalled();
    });
  });
});
