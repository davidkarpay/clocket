import React, { useState, useEffect, useRef } from 'react';
import {
  initializeSpeakingTime,
  startSpeaking,
  stopTracking,
  calculateStatistics,
  formatTime,
  generateTextReport,
  generateChartData,
  addParty,
  removeParty
} from '../utils/speakingTimeTracker';

function SpeakingTimeTracker({ hearing, onSaveReport }) {
  const [speakingState, setSpeakingState] = useState(() => 
    initializeSpeakingTime(['State', 'Defense', 'Court'])
  );
  const [showReport, setShowReport] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [newPartyName, setNewPartyName] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    // Update timer every 100ms when active
    if (speakingState.isActive && !speakingState.isPaused) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(Date.now());
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [speakingState.isActive, speakingState.isPaused]);

  const handlePartyClick = (party) => {
    if (!speakingState.isActive || speakingState.isPaused) {
      // Start tracking
      setSpeakingState(state => startSpeaking(state, party));
    } else if (speakingState.currentSpeaker !== party) {
      // Switch speaker
      setSpeakingState(state => startSpeaking(state, party));
    }
  };

  const handleRecess = () => {
    setSpeakingState(state => {
      const newState = stopTracking(state);
      return newState;
    });
    setShowReport(true);
  };

  const handleReset = () => {
    setSpeakingState(initializeSpeakingTime(Object.keys(speakingState.parties)));
    setShowReport(false);
    setCurrentTime(0);
  };

  const handleAddParty = () => {
    if (newPartyName.trim()) {
      setSpeakingState(state => addParty(state, newPartyName.trim()));
      setNewPartyName('');
    }
  };

  const handleRemoveParty = (party) => {
    setSpeakingState(state => removeParty(state, party));
  };

  const handleSaveReport = () => {
    const report = generateTextReport(speakingState, hearing);
    const chartData = generateChartData(speakingState);
    const stats = calculateStatistics(speakingState);
    
    if (onSaveReport) {
      onSaveReport({
        report,
        chartData,
        stats,
        timestamp: Date.now()
      });
    }
  };

  const getCurrentSpeakerTime = () => {
    if (speakingState.currentSpeaker && speakingState.startTime) {
      const elapsed = (currentTime || Date.now()) - speakingState.startTime;
      return formatTime(elapsed);
    }
    return '0:00';
  };

  const getTotalHearingTime = () => {
    if (speakingState.hearingStartTime) {
      const endTime = speakingState.hearingEndTime || currentTime || Date.now();
      return formatTime(endTime - speakingState.hearingStartTime);
    }
    return '0:00';
  };

  const stats = showReport ? calculateStatistics(speakingState) : null;

  return (
    <div className="speaking-time-tracker" data-testid="speaking-time-tracker">
      <div className="tracker-header">
        <h3>⏱️ Speaking Time Tracker</h3>
        <div className="hearing-timer">
          Total Time: <span className="timer-display">{getTotalHearingTime()}</span>
        </div>
      </div>

      {!showReport ? (
        <>
          <div className="party-buttons">
            {Object.keys(speakingState.parties).map(party => (
              <button
                key={party}
                className={`party-button ${speakingState.currentSpeaker === party ? 'active' : ''}`}
                onClick={() => handlePartyClick(party)}
                data-testid={`party-button-${party}`}
              >
                <div className="party-name">{party}</div>
                <div className="party-time">
                  {speakingState.currentSpeaker === party 
                    ? getCurrentSpeakerTime()
                    : formatTime(speakingState.parties[party].totalTime)
                  }
                </div>
              </button>
            ))}
          </div>

          <div className="tracker-controls">
            <button 
              className="btn btn-recess"
              onClick={handleRecess}
              disabled={!speakingState.isActive}
              data-testid="recess-button"
            >
              ⏸️ Recess
            </button>
            <button 
              className="btn btn-reset"
              onClick={handleReset}
              data-testid="reset-button"
            >
              🔄 Reset
            </button>
          </div>

          <div className="add-party-section">
            <input
              type="text"
              placeholder="Add party..."
              value={newPartyName}
              onChange={(e) => setNewPartyName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddParty()}
              className="add-party-input"
              data-testid="add-party-input"
            />
            <button 
              className="btn btn-add"
              onClick={handleAddParty}
              data-testid="add-party-button"
            >
              ➕ Add
            </button>
          </div>

          {speakingState.currentSpeaker && (
            <div className="current-speaker-indicator">
              <div className="speaker-label">Now Speaking:</div>
              <div className="speaker-name">{speakingState.currentSpeaker}</div>
              <div className="speaker-time">{getCurrentSpeakerTime()}</div>
            </div>
          )}
        </>
      ) : (
        <div className="speaking-report" data-testid="speaking-report">
          <h4>📊 Speaking Time Report</h4>
          
          <div className="report-summary">
            <div className="summary-item">
              <span className="label">Total Duration:</span>
              <span className="value">{formatTime(stats.totalHearingTime)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Speaking Time:</span>
              <span className="value">{formatTime(stats.totalSpeakingTime)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Silence/Transitions:</span>
              <span className="value">{formatTime(stats.silenceTime)}</span>
            </div>
          </div>

          <div className="party-stats">
            {Object.entries(stats.parties)
              .sort((a, b) => b[1].totalTime - a[1].totalTime)
              .map(([party, data]) => (
                <div key={party} className="party-stat-item">
                  <div className="party-stat-header">
                    <span className="party-name">{party}</span>
                    <span className="party-percentage">{data.percentage}%</span>
                  </div>
                  <div className="party-stat-details">
                    <span>Time: {formatTime(data.totalTime)}</span>
                    <span>Turns: {data.segmentCount}</span>
                    <span>Avg: {formatTime(data.averageSegmentTime)}</span>
                  </div>
                  <div className="party-stat-bar">
                    <div 
                      className="party-stat-fill"
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>

          <div className="chart-container" data-testid="pie-chart-container">
            <canvas id={`chart-${hearing.id}`} width="300" height="300"></canvas>
          </div>

          <div className="report-actions">
            <button 
              className="btn btn-save"
              onClick={handleSaveReport}
              data-testid="save-report-button"
            >
              💾 Save Report
            </button>
            <button 
              className="btn btn-download"
              onClick={() => {
                const report = generateTextReport(speakingState, hearing);
                const blob = new Blob([report], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${hearing['Case Number']}_speaking_time_report.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              data-testid="download-report-button"
            >
              📥 Download Report
            </button>
            <button 
              className="btn btn-close"
              onClick={() => setShowReport(false)}
              data-testid="close-report-button"
            >
              ✖️ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpeakingTimeTracker;