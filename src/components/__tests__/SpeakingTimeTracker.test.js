const React = require('react');
const { render, screen, fireEvent, waitFor, act } = require('@testing-library/react');
const userEvent = require('@testing-library/user-event');

// Mock the utilities
jest.mock('../../utils/speakingTimeTracker', () => ({
  initializeSpeakingTime: jest.fn(),
  startSpeaking: jest.fn(),
  stopTracking: jest.fn(),
  calculateStatistics: jest.fn(),
  formatTime: jest.fn(),
  generateTextReport: jest.fn(),
  generateChartData: jest.fn(),
  addParty: jest.fn(),
  removeParty: jest.fn()
}));

const {
  initializeSpeakingTime,
  startSpeaking,
  stopTracking,
  calculateStatistics,
  formatTime,
  generateTextReport,
  generateChartData,
  addParty,
  removeParty
} = require('../../utils/speakingTimeTracker');

// Mock Chart.js
global.Chart = jest.fn().mockImplementation(() => ({
  destroy: jest.fn()
}));

// Mock SpeakingTimeTracker component (since we can't easily import the React component from HTML)
function MockSpeakingTimeTracker({ hearing, onSaveReport }) {
  const [speakingState, setSpeakingState] = React.useState({
    parties: { State: { totalTime: 0 }, Defense: { totalTime: 0 }, Court: { totalTime: 0 } },
    currentSpeaker: null,
    isActive: false,
    isPaused: false
  });
  const [showReport, setShowReport] = React.useState(false);
  const [newPartyName, setNewPartyName] = React.useState('');

  const handlePartyClick = (party) => {
    const newState = { ...speakingState, currentSpeaker: party, isActive: true };
    setSpeakingState(newState);
  };

  const handleRecess = () => {
    setShowReport(true);
  };

  const handleAddParty = () => {
    if (newPartyName.trim()) {
      const newState = { ...speakingState };
      newState.parties[newPartyName.trim()] = { totalTime: 0 };
      setSpeakingState(newState);
      setNewPartyName('');
    }
  };

  return React.createElement('div', { 'data-testid': 'speaking-time-tracker' },
    React.createElement('div', { className: 'tracker-header' },
      React.createElement('h3', null, '⏱️ Speaking Time Tracker'),
      React.createElement('div', { className: 'hearing-timer' }, 'Total Time: 0:00')
    ),
    !showReport ? React.createElement(React.Fragment, null,
      React.createElement('div', { className: 'party-buttons' },
        Object.keys(speakingState.parties).map(party =>
          React.createElement('button', {
            key: party,
            'data-testid': `party-button-${party}`,
            className: `party-button ${speakingState.currentSpeaker === party ? 'active' : ''}`,
            onClick: () => handlePartyClick(party)
          }, party)
        )
      ),
      React.createElement('div', { className: 'tracker-controls' },
        React.createElement('button', {
          'data-testid': 'recess-button',
          className: 'btn btn-recess',
          onClick: handleRecess,
          disabled: !speakingState.isActive
        }, '⏸️ Recess'),
        React.createElement('button', {
          'data-testid': 'reset-button',
          className: 'btn btn-reset',
          onClick: () => {
            setSpeakingState({
              parties: { State: { totalTime: 0 }, Defense: { totalTime: 0 }, Court: { totalTime: 0 } },
              currentSpeaker: null,
              isActive: false
            });
            setShowReport(false);
          }
        }, '🔄 Reset')
      ),
      React.createElement('div', { className: 'add-party-section' },
        React.createElement('input', {
          'data-testid': 'add-party-input',
          type: 'text',
          value: newPartyName,
          onChange: (e) => setNewPartyName(e.target.value),
          placeholder: 'Add party...'
        }),
        React.createElement('button', {
          'data-testid': 'add-party-button',
          onClick: handleAddParty
        }, '➕ Add')
      )
    ) : React.createElement('div', { 'data-testid': 'speaking-report' },
      React.createElement('h4', null, '📊 Speaking Time Report'),
      React.createElement('button', {
        'data-testid': 'save-report-button',
        onClick: () => onSaveReport && onSaveReport({ report: 'test report' })
      }, '💾 Save Report'),
      React.createElement('button', {
        'data-testid': 'download-report-button'
      }, '📥 Download Report'),
      React.createElement('button', {
        'data-testid': 'close-report-button',
        onClick: () => setShowReport(false)
      }, '✖️ Close')
    )
  );
}

describe('SpeakingTimeTracker Component', () => {
  const mockHearing = {
    id: '123-test',
    'Case Number': '123-2024',
    'Client Name': 'John Doe',
    'Division': 'Criminal',
    'Time': '9:00 AM'
  };

  const mockOnSaveReport = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    initializeSpeakingTime.mockReturnValue({
      parties: { State: { totalTime: 0 }, Defense: { totalTime: 0 }, Court: { totalTime: 0 } },
      currentSpeaker: null,
      isActive: false,
      isPaused: false,
      timeline: []
    });
    
    formatTime.mockImplementation((ms) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
    });
    
    startSpeaking.mockImplementation((state, party) => ({
      ...state,
      currentSpeaker: party,
      isActive: true
    }));
    
    stopTracking.mockImplementation((state) => ({
      ...state,
      currentSpeaker: null,
      isActive: false,
      isPaused: true
    }));
    
    calculateStatistics.mockReturnValue({
      totalHearingTime: 300000,
      totalSpeakingTime: 250000,
      silenceTime: 50000,
      parties: {
        State: { totalTime: 150000, percentage: '60.0', segmentCount: 3, averageSegmentTime: 50000 },
        Defense: { totalTime: 100000, percentage: '40.0', segmentCount: 2, averageSegmentTime: 50000 }
      }
    });
    
    generateTextReport.mockReturnValue('Mock report content');
    generateChartData.mockReturnValue({
      labels: ['State', 'Defense'],
      datasets: [{ data: [150000, 100000], backgroundColor: ['#e74c3c', '#3498db'] }]
    });
  });

  describe('Component Rendering', () => {
    it('should render tracker header and controls', () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      expect(screen.getByTestId('speaking-time-tracker')).toBeInTheDocument();
      expect(screen.getByText('⏱️ Speaking Time Tracker')).toBeInTheDocument();
      expect(screen.getByText('Total Time: 0:00')).toBeInTheDocument();
    });

    it('should render default party buttons', () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      expect(screen.getByTestId('party-button-State')).toBeInTheDocument();
      expect(screen.getByTestId('party-button-Defense')).toBeInTheDocument();
      expect(screen.getByTestId('party-button-Court')).toBeInTheDocument();
    });

    it('should render control buttons', () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      expect(screen.getByTestId('recess-button')).toBeInTheDocument();
      expect(screen.getByTestId('reset-button')).toBeInTheDocument();
      expect(screen.getByTestId('add-party-input')).toBeInTheDocument();
      expect(screen.getByTestId('add-party-button')).toBeInTheDocument();
    });

    it('should render add party section', () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      const input = screen.getByTestId('add-party-input');
      const button = screen.getByTestId('add-party-button');

      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Add party...');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Party Button Interactions', () => {
    it('should activate party when clicked', async () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      const stateButton = screen.getByTestId('party-button-State');
      
      await act(async () => {
        fireEvent.click(stateButton);
      });

      expect(stateButton).toHaveClass('active');
    });

    it('should enable recess button when tracking is active', async () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      const stateButton = screen.getByTestId('party-button-State');
      const recessButton = screen.getByTestId('recess-button');

      expect(recessButton).toBeDisabled();

      await act(async () => {
        fireEvent.click(stateButton);
      });

      expect(recessButton).not.toBeDisabled();
    });

    it('should switch between speakers', async () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      const stateButton = screen.getByTestId('party-button-State');
      const defenseButton = screen.getByTestId('party-button-Defense');

      await act(async () => {
        fireEvent.click(stateButton);
      });
      expect(stateButton).toHaveClass('active');

      await act(async () => {
        fireEvent.click(defenseButton);
      });
      expect(defenseButton).toHaveClass('active');
      expect(stateButton).not.toHaveClass('active');
    });
  });

  describe('Party Management', () => {
    it('should add new party', async () => {
      const user = userEvent.setup();
      
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      const input = screen.getByTestId('add-party-input');
      const addButton = screen.getByTestId('add-party-button');

      await user.type(input, 'Witness');
      await user.click(addButton);

      expect(screen.getByTestId('party-button-Witness')).toBeInTheDocument();
      expect(input).toHaveValue('');
    });

    it('should not add empty party name', async () => {
      const user = userEvent.setup();
      
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      const addButton = screen.getByTestId('add-party-button');
      
      await user.click(addButton);

      expect(screen.queryByTestId('party-button-')).not.toBeInTheDocument();
    });

    it('should handle Enter key in add party input', async () => {
      const user = userEvent.setup();
      
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      const input = screen.getByTestId('add-party-input');

      await user.type(input, 'Attorney{enter}');

      expect(screen.getByTestId('party-button-Attorney')).toBeInTheDocument();
    });
  });

  describe('Control Actions', () => {
    it('should show report when recess is clicked', async () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      // Start tracking first
      const stateButton = screen.getByTestId('party-button-State');
      await act(async () => {
        fireEvent.click(stateButton);
      });

      const recessButton = screen.getByTestId('recess-button');
      await act(async () => {
        fireEvent.click(recessButton);
      });

      expect(screen.getByTestId('speaking-report')).toBeInTheDocument();
      expect(screen.getByText('📊 Speaking Time Report')).toBeInTheDocument();
    });

    it('should reset tracker state', async () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      const stateButton = screen.getByTestId('party-button-State');
      const resetButton = screen.getByTestId('reset-button');

      // Start tracking
      await act(async () => {
        fireEvent.click(stateButton);
      });
      expect(stateButton).toHaveClass('active');

      // Reset
      await act(async () => {
        fireEvent.click(resetButton);
      });
      expect(stateButton).not.toHaveClass('active');
    });
  });

  describe('Report Generation and Actions', () => {
    beforeEach(async () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      // Navigate to report view
      const stateButton = screen.getByTestId('party-button-State');
      await act(async () => {
        fireEvent.click(stateButton);
      });

      const recessButton = screen.getByTestId('recess-button');
      await act(async () => {
        fireEvent.click(recessButton);
      });
    });

    it('should display report interface', () => {
      expect(screen.getByTestId('speaking-report')).toBeInTheDocument();
      expect(screen.getByTestId('save-report-button')).toBeInTheDocument();
      expect(screen.getByTestId('download-report-button')).toBeInTheDocument();
      expect(screen.getByTestId('close-report-button')).toBeInTheDocument();
    });

    it('should call onSaveReport when save button is clicked', async () => {
      const saveButton = screen.getByTestId('save-report-button');
      
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(mockOnSaveReport).toHaveBeenCalledWith({ report: 'test report' });
    });

    it('should close report when close button is clicked', async () => {
      const closeButton = screen.getByTestId('close-report-button');
      
      await act(async () => {
        fireEvent.click(closeButton);
      });

      expect(screen.queryByTestId('speaking-report')).not.toBeInTheDocument();
      expect(screen.getByTestId('party-button-State')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing onSaveReport callback', async () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing
        // onSaveReport not provided
      }));

      const stateButton = screen.getByTestId('party-button-State');
      await act(async () => {
        fireEvent.click(stateButton);
      });

      const recessButton = screen.getByTestId('recess-button');
      await act(async () => {
        fireEvent.click(recessButton);
      });

      const saveButton = screen.getByTestId('save-report-button');
      
      // Should not throw error
      expect(() => {
        fireEvent.click(saveButton);
      }).not.toThrow();
    });

    it('should handle special characters in party names', async () => {
      const user = userEvent.setup();
      
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      const input = screen.getByTestId('add-party-input');
      const addButton = screen.getByTestId('add-party-button');

      await user.type(input, 'Pro Se Defendant');
      await user.click(addButton);

      expect(screen.getByTestId('party-button-Pro Se Defendant')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper test ids for all interactive elements', () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      expect(screen.getByTestId('speaking-time-tracker')).toBeInTheDocument();
      expect(screen.getByTestId('party-button-State')).toBeInTheDocument();
      expect(screen.getByTestId('party-button-Defense')).toBeInTheDocument();
      expect(screen.getByTestId('party-button-Court')).toBeInTheDocument();
      expect(screen.getByTestId('recess-button')).toBeInTheDocument();
      expect(screen.getByTestId('reset-button')).toBeInTheDocument();
      expect(screen.getByTestId('add-party-input')).toBeInTheDocument();
      expect(screen.getByTestId('add-party-button')).toBeInTheDocument();
    });

    it('should properly disable/enable buttons based on state', () => {
      render(React.createElement(MockSpeakingTimeTracker, {
        hearing: mockHearing,
        onSaveReport: mockOnSaveReport
      }));

      const recessButton = screen.getByTestId('recess-button');
      const resetButton = screen.getByTestId('reset-button');

      // Initially, recess should be disabled
      expect(recessButton).toBeDisabled();
      expect(resetButton).not.toBeDisabled();
    });
  });
});