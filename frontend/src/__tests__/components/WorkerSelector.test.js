import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkerSelector from '../../components/shifts/WorkerSelector';

describe('WorkerSelector', () => {
  const mockWorkers = [
    { id: 1, full_name: 'John Doe (Johnny)' },
    { id: 2, full_name: 'Jane Smith' },
    { id: 3, full_name: 'Bob Johnson (Bobby)' }
  ];

  const defaultProps = {
    workers: mockWorkers,
    selectedWorkers: [],
    onWorkerToggle: jest.fn(),
    unavailableWorkers: new Map(),
    getDisplayName: (fullName) => {
      const match = fullName.match(/\(([^)]+)\)/);
      return match ? match[1] : fullName.split(' ')[0];
    },
    isWorkerUnavailable: jest.fn(() => false),
    isWorkerAvailableForTime: jest.fn(() => true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all workers', () => {
    render(<WorkerSelector {...defaultProps} />);
    
    expect(screen.getByText('Johnny')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Bobby')).toBeInTheDocument();
  });

  test('calls onWorkerToggle when worker is clicked', () => {
    render(<WorkerSelector {...defaultProps} />);
    
    const johnnyCheckbox = screen.getByLabelText(/Johnny/);
    fireEvent.click(johnnyCheckbox);
    
    expect(defaultProps.onWorkerToggle).toHaveBeenCalledWith(1);
  });

  test('shows selected workers as checked', () => {
    const props = {
      ...defaultProps,
      selectedWorkers: [1, 3]
    };
    
    render(<WorkerSelector {...props} />);
    
    const johnnyCheckbox = screen.getByLabelText(/Johnny/);
    const bobbyCheckbox = screen.getByLabelText(/Bobby/);
    const janeCheckbox = screen.getByLabelText(/Jane/);
    
    expect(johnnyCheckbox).toBeChecked();
    expect(bobbyCheckbox).toBeChecked();
    expect(janeCheckbox).not.toBeChecked();
  });

  test('disables unavailable workers', () => {
    const props = {
      ...defaultProps,
      isWorkerUnavailable: jest.fn((id) => id === 2)
    };
    
    render(<WorkerSelector {...props} />);
    
    const janeCheckbox = screen.getByLabelText(/Jane/);
    expect(janeCheckbox).toBeDisabled();
    expect(screen.getByText('(Unavailable)')).toBeInTheDocument();
  });

  test('disables workers not available for time', () => {
    const props = {
      ...defaultProps,
      isWorkerAvailableForTime: jest.fn((id) => id !== 3)
    };
    
    render(<WorkerSelector {...props} />);
    
    const bobbyCheckbox = screen.getByLabelText(/Bobby/);
    expect(bobbyCheckbox).toBeDisabled();
    expect(screen.getByText('(Not available for this time)')).toBeInTheDocument();
  });

  test('applies correct styling for selected workers', () => {
    const props = {
      ...defaultProps,
      selectedWorkers: [1]
    };
    
    render(<WorkerSelector {...props} />);
    
    const johnnyLabel = screen.getByLabelText(/Johnny/).closest('label');
    expect(johnnyLabel).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  test('applies correct styling for disabled workers', () => {
    const props = {
      ...defaultProps,
      isWorkerUnavailable: jest.fn((id) => id === 2)
    };
    
    render(<WorkerSelector {...props} />);
    
    const janeLabel = screen.getByLabelText(/Jane/).closest('label');
    expect(janeLabel).toHaveClass('bg-gray-100', 'text-gray-400', 'cursor-not-allowed');
  });
});
