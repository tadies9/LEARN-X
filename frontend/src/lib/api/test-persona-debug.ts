import { API_CLIENT } from './client';

export async function testPersonaDebug() {
  const testData = {
    academicCareer: {
      currentStatus: "Finance Major",
      aspiredIndustry: "Education",
      fieldOfStudy: "",
      careerGoalsLearningObjectives: ""
    },
    interests: {
      primary: ["Basketball"],
      secondary: [],
      learningTopics: ["Machine Learning"]
    },
    learningStyle: {
      primary: "visual",
      secondary: "reading",
      preferenceStrength: 0.8
    },
    contentPreferences: {
      density: "balanced",
      examplesPerConcept: 2,
      summaryStyle: "bullet_points",
      detailTolerance: "medium",
      repetitionPreference: "moderate"
    },
    communication: {
      style: "professional_friendly",
      encouragementLevel: "moderate",
      humorAppropriate: false
    }
  };

  console.log('🧪 Testing persona debug endpoint...');
  console.log('🧪 Sending data:', JSON.stringify(testData, null, 2));

  try {
    const response = await API_CLIENT.post('/persona/debug-validate', testData);
    console.log('✅ Debug response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Debug error:', error.response?.data || error.message);
    throw error;
  }
}

// Make function available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testPersonaDebug = testPersonaDebug;
}