/**
 * Speaking Time Tracker Utilities
 * Tracks which party is speaking and for how long during court proceedings
 */

/**
 * Initialize speaking time state for a hearing
 * @param {Array} parties - Array of party names (default: ['State', 'Defense', 'Court'])
 * @returns {Object} Initial speaking time state
 */
function initializeSpeakingTime(parties = ['State', 'Defense', 'Court']) {
  // Handle null/undefined inputs
  if (!parties || !Array.isArray(parties)) {
    parties = ['State', 'Defense', 'Court'];
  }
  
  return {
    parties: parties.reduce((acc, party) => {
      acc[party] = {
        totalTime: 0,
        segments: []
      };
      return acc;
    }, {}),
    currentSpeaker: null,
    startTime: null,
    hearingStartTime: null,
    hearingEndTime: null,
    isActive: false,
    isPaused: false,
    timeline: []
  };
}

/**
 * Start tracking time for a party
 * @param {Object} state - Current speaking time state
 * @param {string} party - Party name who is now speaking
 * @returns {Object} Updated state
 */
function startSpeaking(state, party) {
  // Handle null state
  if (!state) {
    return initializeSpeakingTime();
  }
  
  // Handle null/empty party
  if (!party || typeof party !== 'string') {
    return state;
  }
  
  try {
    const now = Date.now();
    const newState = { ...state };
    
    // Ensure parties object exists
    if (!newState.parties) {
      newState.parties = {};
    }
    
    // Ensure timeline exists
    if (!newState.timeline) {
      newState.timeline = [];
    }
    
    // If this is the first speaker, mark hearing start time
    if (!newState.hearingStartTime) {
      newState.hearingStartTime = now;
      newState.isActive = true;
    }
    
    // If someone was already speaking, stop their time
    if (newState.currentSpeaker && newState.currentSpeaker !== party && newState.parties[newState.currentSpeaker]) {
      const duration = now - newState.startTime;
      
      // Add to the previous speaker's total time
      newState.parties[newState.currentSpeaker].totalTime += duration;
      
      // Add segment to the previous speaker's history
      if (!newState.parties[newState.currentSpeaker].segments) {
        newState.parties[newState.currentSpeaker].segments = [];
      }
      newState.parties[newState.currentSpeaker].segments.push({
        start: newState.startTime,
        end: now,
        duration
      });
      
      // Add to timeline
      newState.timeline.push({
        party: newState.currentSpeaker,
        start: newState.startTime,
        end: now,
        duration
      });
    }
    
    // Ensure the party exists
    if (!newState.parties[party]) {
      newState.parties[party] = { totalTime: 0, segments: [] };
    }
    
    // Start tracking the new speaker
    newState.currentSpeaker = party;
    newState.startTime = now;
    newState.isPaused = false;
    
    return newState;
  } catch (error) {
    return state;
  }
}

/**
 * Stop tracking (recess)
 * @param {Object} state - Current speaking time state
 * @returns {Object} Updated state with final calculations
 */
function stopTracking(state) {
  // Handle null state
  if (!state) {
    return initializeSpeakingTime();
  }
  
  try {
    const now = Date.now();
    const newState = { ...state };
    
    // Ensure required properties exist
    if (!newState.parties) {
      newState.parties = {};
    }
    if (!newState.timeline) {
      newState.timeline = [];
    }
    
    // If someone was speaking, finalize their time
    if (newState.currentSpeaker && newState.startTime && newState.parties[newState.currentSpeaker]) {
      const duration = now - newState.startTime;
      
      newState.parties[newState.currentSpeaker].totalTime += duration;
      
      if (!newState.parties[newState.currentSpeaker].segments) {
        newState.parties[newState.currentSpeaker].segments = [];
      }
      newState.parties[newState.currentSpeaker].segments.push({
        start: newState.startTime,
        end: now,
        duration
      });
      
      newState.timeline.push({
        party: newState.currentSpeaker,
        start: newState.startTime,
        end: now,
        duration
      });
    }
    
    newState.hearingEndTime = now;
    newState.currentSpeaker = null;
    newState.startTime = null;
    newState.isActive = false;
    newState.isPaused = true;
    
    return newState;
  } catch (error) {
    return state;
  }
}

/**
 * Calculate statistics from speaking time data
 * @param {Object} state - Speaking time state
 * @returns {Object} Statistics including percentages and totals
 */
function calculateStatistics(state) {
  // Handle null state
  if (!state) {
    return {
      totalHearingTime: 0,
      totalSpeakingTime: 0,
      silenceTime: 0,
      parties: {}
    };
  }
  
  try {
    const totalHearingTime = (state.hearingEndTime || 0) - (state.hearingStartTime || 0);
    const parties = state.parties || {};
    const totalSpeakingTime = Object.values(parties)
      .reduce((sum, party) => sum + (party ? party.totalTime || 0 : 0), 0);
    
    const stats = {
      totalHearingTime: Math.max(0, totalHearingTime),
      totalSpeakingTime,
      silenceTime: Math.max(0, totalHearingTime - totalSpeakingTime),
      parties: {}
    };
    
    // Calculate per-party statistics
    Object.entries(parties).forEach(([partyName, partyData]) => {
      if (partyData && typeof partyData === 'object') {
        const totalTime = partyData.totalTime || 0;
        const segments = partyData.segments || [];
        
        stats.parties[partyName] = {
          totalTime,
          percentage: totalSpeakingTime > 0 
            ? (totalTime / totalSpeakingTime * 100).toFixed(1)
            : '0',
          segmentCount: segments.length,
          averageSegmentTime: segments.length > 0
            ? Math.round(totalTime / segments.length)
            : 0
        };
      }
    });
    
    return stats;
  } catch (error) {
    return {
      totalHearingTime: 0,
      totalSpeakingTime: 0,
      silenceTime: 0,
      parties: {}
    };
  }
}

/**
 * Format milliseconds to human-readable time
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted time string (HH:MM:SS or MM:SS)
 */
function formatTime(ms) {
  // Handle invalid inputs
  if (ms === null || ms === undefined || isNaN(ms)) {
    return '0:00';
  }
  
  // Handle negative values
  if (ms < 0) {
    return '0:00';
  }
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
}

/**
 * Generate a text report of speaking times
 * @param {Object} state - Speaking time state
 * @param {Object} hearingInfo - Hearing metadata
 * @returns {string} Formatted text report
 */
function generateTextReport(state, hearingInfo) {
  // Handle null inputs
  if (!state) {
    state = initializeSpeakingTime();
  }
  if (!hearingInfo) {
    hearingInfo = {};
  }
  
  try {
    const stats = calculateStatistics(state);
    
    let report = `SPEAKING TIME REPORT\n`;
    report += `====================\n\n`;
    report += `Case: ${hearingInfo['Case Number'] || 'N/A'}\n`;
    report += `Client: ${hearingInfo['Client Name'] || 'N/A'}\n`;
    report += `Division: ${hearingInfo['Division'] || 'N/A'}\n`;
    report += `Date: ${state.hearingStartTime ? new Date(state.hearingStartTime).toLocaleString() : 'N/A'}\n\n`;
    
    report += `SUMMARY\n`;
    report += `-------\n`;
    report += `Total Hearing Duration: ${formatTime(stats.totalHearingTime)}\n`;
    report += `Total Speaking Time: ${formatTime(stats.totalSpeakingTime)}\n`;
    report += `Silence/Transitions: ${formatTime(stats.silenceTime)}\n\n`;
    
    report += `SPEAKING TIME BY PARTY\n`;
    report += `---------------------\n`;
    
    Object.entries(stats.parties)
      .sort((a, b) => b[1].totalTime - a[1].totalTime)
      .forEach(([party, data]) => {
        report += `${party}:\n`;
        report += `  Total Time: ${formatTime(data.totalTime)} (${data.percentage}%)\n`;
        report += `  Speaking Turns: ${data.segmentCount}\n`;
        report += `  Average per Turn: ${formatTime(data.averageSegmentTime)}\n\n`;
      });
    
    report += `TIMELINE\n`;
    report += `--------\n`;
    const timeline = state.timeline || [];
    timeline.forEach((segment, index) => {
      if (segment && segment.start && segment.party && segment.duration !== undefined) {
        const startTime = new Date(segment.start).toLocaleTimeString();
        const duration = formatTime(segment.duration);
        report += `${index + 1}. ${startTime} - ${segment.party} (${duration})\n`;
      }
    });
    
    return report;
  } catch (error) {
    return 'Error generating report';
  }
}

/**
 * Generate chart data for visualization
 * @param {Object} state - Speaking time state
 * @returns {Object} Chart data suitable for pie chart rendering
 */
function generateChartData(state) {
  // Handle null state
  if (!state) {
    return {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  }
  
  try {
    const stats = calculateStatistics(state);
    
    return {
      labels: Object.keys(stats.parties),
      datasets: [{
        data: Object.values(stats.parties).map(p => p.totalTime),
        backgroundColor: [
          '#e74c3c', // Red for State
          '#3498db', // Blue for Defense
          '#95a5a6', // Gray for Court
          '#f39c12', // Orange for additional parties
          '#9b59b6', // Purple
          '#1abc9c'  // Turquoise
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  } catch (error) {
    return {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  }
}

/**
 * Add a custom party to the tracker
 * @param {Object} state - Current speaking time state
 * @param {string} partyName - Name of the new party
 * @returns {Object} Updated state
 */
function addParty(state, partyName) {
  // Handle null state
  if (!state) {
    state = initializeSpeakingTime();
  }
  
  // Validate party name - reject empty or whitespace-only names
  if (!partyName || typeof partyName !== 'string' || partyName.trim() === '') {
    return state;
  }
  
  const newState = { ...state };
  
  // Ensure parties object exists
  if (!newState.parties) {
    newState.parties = {};
  }
  
  // Add party if it doesn't exist
  if (!newState.parties[partyName]) {
    newState.parties[partyName] = {
      totalTime: 0,
      segments: []
    };
  }
  
  return newState;
}

/**
 * Remove a party from the tracker
 * @param {Object} state - Current speaking time state
 * @param {string} partyName - Name of the party to remove
 * @returns {Object} Updated state
 */
function removeParty(state, partyName) {
  const newState = { ...state };
  
  // Don't remove if this party is currently speaking
  if (newState.currentSpeaker === partyName) {
    return state;
  }
  
  delete newState.parties[partyName];
  
  return newState;
}

module.exports = {
  initializeSpeakingTime,
  startSpeaking,
  stopTracking,
  calculateStatistics,
  formatTime,
  generateTextReport,
  generateChartData,
  addParty,
  removeParty
};