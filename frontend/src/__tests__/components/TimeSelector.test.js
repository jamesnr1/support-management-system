import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimeSelector from '../../components/shifts/TimeSelector';

describe('TimeSelector', () => {
  const defaultProps = {
    startTime: '09:00',
    endTime: '17:00',
    onStartTimeChange: jest.fn(),
    onEndTimeChange: jest.fn(),
    isFullDay: false,
    onFullDayToggle: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders time inputs when not full day', () => {
    render(<TimeSelector {...defaultProps} />);
    
    expect(screen.getByLabelText('Start Time')).toBeInTheDocument();
    expect(screen.getByLabelText('End Time')).toBeInTheDocument();
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('17:00')).toBeInTheDocument();
  });

  test('hides time inputs when full day is selected', () => {
    const props = {
      ...defaultProps,
      isFullDay: true
    };
    
    render(<TimeSelector {...props} />);
    
    expect(screen.queryByLabelText('Start Time')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('End Time')).not.toBeInTheDocument();
  });

  test('calls onStartTimeChange when start time is changed', () => {
    render(<TimeSelector {...defaultProps} />);
    
    const startTimeInput = screen.getByLabelText('Start Time');
    fireEvent.change(startTimeInput, { target: { value: '10:00' } });
    
    expect(defaultProps.onStartTimeChange).toHaveBeenCalledWith('10:00');
  });

  test('calls onEndTimeChange when end time is changed', () => {
    render(<TimeSelector {...defaultProps} />);
    
    const endTimeInput = screen.getByLabelText('End Time');
    fireEvent.change(endTimeInput, { target: { value: '18:00' } });
    
    expect(defaultProps.onEndTimeChange).toHaveBeenCalledWith('18:00');
  });

  test('calls onFullDayToggle when full day checkbox is clicked', () => {
    render(<TimeSelector {...defaultProps} />);
    
    const fullDayCheckbox = screen.getByLabelText('Full Day Shift');
    fireEvent.click(fullDayCheckbox);
    
    expect(defaultProps.onFullDayToggle).toHaveBeenCalled();
  });

  test('shows full day checkbox as checked when isFullDay is true', () => {
    const props = {
      ...defaultProps,
      isFullDay: true
    };
    
    render(<TimeSelector {...props} />);
    
    const fullDayCheckbox = screen.getByLabelText('Full Day Shift');
    expect(fullDayCheckbox).toBeChecked();
  });

  test('shows full day checkbox as unchecked when isFullDay is false', () => {
    render(<TimeSelector {...defaultProps} />);
    
    const fullDayCheckbox = screen.getByLabelText('Full Day Shift');
    expect(fullDayCheckbox).not.toBeChecked();
  });

  test('renders with correct default values', () => {
    render(<TimeSelector {...defaultProps} />);
    
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('17:00')).toBeInTheDocument();
  });
});
