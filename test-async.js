// Test async functionality
console.log('🧪 Testing Async Functions...\n');

const { generateMockTranscript } = require('./src/utils/transcriptGenerator');

async function runAsyncTests() {
  let passed = 0;
  let failed = 0;

  async function test(name, testFn) {
    try {
      await testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  // Mock Blob since we're in Node.js
  global.Blob = function(content, options) {
    return {
      content,
      type: options?.type || 'text/plain',
      size: content?.length || 0
    };
  };

  await test('generateMockTranscript should generate transcript with hearing details', async () => {
    const mockHearing = {
      'Case Number': '123-2024',
      'Client Name': 'John Doe',
      'Division': 'Criminal',
      'Time': '9:00 AM'
    };
    
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
    const duration = 300; // 5 minutes

    const result = await generateMockTranscript(audioBlob, mockHearing, duration);

    if (!result.includes('123-2024')) throw new Error('Case number not in transcript');
    if (!result.includes('John Doe')) throw new Error('Client name not in transcript');
    if (!result.includes('Criminal')) throw new Error('Division not in transcript');
    if (!result.includes('9:00 AM')) throw new Error('Time not in transcript');
    if (!result.includes('5:00')) throw new Error('Duration not formatted correctly');
    if (!result.includes('mock transcript')) throw new Error('Mock disclaimer not included');
  });

  await test('generateMockTranscript should simulate processing delay', async () => {
    const mockHearing = { 'Case Number': '123-2024' };
    const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
    
    const startTime = Date.now();
    await generateMockTranscript(audioBlob, mockHearing, 60);
    const endTime = Date.now();
    
    const elapsed = endTime - startTime;
    if (elapsed < 1900) throw new Error('Processing delay too short'); // Should be ~2000ms
    if (elapsed > 2200) throw new Error('Processing delay too long');
  });

  console.log(`\n📊 Async Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 All async tests passed!');
  } else {
    console.log('\n⚠️  Some async tests failed.');
  }
}

runAsyncTests().catch(console.error);